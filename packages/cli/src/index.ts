#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { formatWithOptions, parseArgs } from 'node:util';

import type { CardKind } from '@stats-forge/github-stats-forge-catalog';
import { cardFileStem, cards, findCard } from '@stats-forge/github-stats-forge-catalog';
import { CardConfig } from '@stats-forge/github-stats-forge-core/api';
import type { Logger } from '@stats-forge/github-stats-forge-core/api';

import type { Menu } from './prompts.ts';
import { askRequired, askSavePath, askToken, navigateOptions, pickCard } from './prompts.ts';
import { fromQueryString, toQuery, toQueryString } from './query.ts';
import { readSavedCard, savedCardExists, toAnswers, writeSavedCard } from './saved-card.ts';
import { withSpinner } from './spinner.ts';
import { DEFAULT_ENV_FILE, loadEnvFile, resolveTokens } from './tokens.ts';

/** Room for a slow connection, well short of undici's five minutes on a stalled one. */
const REQUEST_TIMEOUT_MS = 30_000;

/** `EX_TEMPFAIL` from `sysexits.h`: a failure a later run may not repeat, such as a rate limit. */
const EXIT_RETRYABLE = 75;

/** Why a card was not drawn. */
interface Failed {
  failed: string;
  retryable: boolean;
}

/** @returns The exit code a failure leaves: `75` when a retry may work, else `1`. */
const exitCodeFor = (failure: Failed): number => (failure.retryable ? EXIT_RETRYABLE : 1);

/** Writes one of core's diagnostics to stderr, where everything but the result goes. */
const toStderr = (...args: Array<unknown>): void => {
  process.stderr.write(`${formatWithOptions({}, ...args)}\n`);
};

const stderrLogger: Logger = { log: toStderr, error: toStderr };

const HELP = `github-stats-forge — render a GitHub stats card to a local SVG

Usage
  github-stats-forge [options]

Options
  -c, --card <id>       Skip the card prompt: ${cards.map((card) => card.id).join(', ')}
  -o, --out <file>      Where to write the card (default: named after the card)
      --config <file>   Options to load, and where "Save these options" writes
      --options <query> Options as a query string, as the action and a card URL carry them
  -g, --generate        Render what --config holds and exit, without the menu
      --check           As --generate, but fail when --out differs instead of writing it
      --print-query     Print the options as a query string and exit, without rendering
      --pat <token>     GitHub token; repeat for several
      --env-file <file> Env file to read PAT_1, PAT_2, … from (default: ${DEFAULT_ENV_FILE})
  -h, --help            Show this
  -v, --version         Show the version

The token can also come from PAT_1 in the environment, or be typed when asked.
A card that could not be drawn exits 1, or 75 when a later run may draw it.
`;

/** What the command line can carry. */
interface Flags {
  card?: string;
  out?: string;
  config?: string;
  options?: string;
  generate: boolean;
  check: boolean;
  'print-query': boolean;
  pat: Array<string>;
  'env-file'?: string;
  help: boolean;
  version: boolean;
}

/**
 * @returns The flags this run was given.
 */
const readFlags = (): Flags =>
  parseArgs({
    options: {
      card: { type: 'string', short: 'c' },
      out: { type: 'string', short: 'o' },
      config: { type: 'string' },
      options: { type: 'string' },
      generate: { type: 'boolean', short: 'g', default: false },
      check: { type: 'boolean', default: false },
      'print-query': { type: 'boolean', default: false },
      pat: { type: 'string', multiple: true, default: [] },
      'env-file': { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
    allowPositionals: false,
  }).values;

/**
 * Renders a card, reporting on stderr why it could not.
 *
 * @returns The SVG, or the code that says why there is none.
 */
const renderCard = async (
  card: CardKind,
  query: Record<string, string>,
  config: CardConfig,
): Promise<{ content: string } | Failed> => {
  const result = await withSpinner(`Rendering the ${card.id} card`, async () =>
    card.render(query, config),
  );

  if (result.status === 'success') {
    return { content: result.content };
  }

  const { code, text, param } = result.error;
  process.stderr.write(
    `${[
      `Could not render the ${card.id} card.`,
      `  ${text}`,
      `  code: ${code}${param ? `, param: ${param}` : ''}`,
      result.retryable ? '  This one may work on a retry.' : '',
    ]
      .filter(Boolean)
      .join('\n')}\n`,
  );
  return { failed: code, retryable: result.retryable };
};

/** @returns Where a card is written, absolute, named after the card unless `out` says. */
const outFile = (card: CardKind, query: Record<string, string>, out: string | undefined): string =>
  resolve(process.cwd(), out ?? `${cardFileStem(card, query)}.svg`);

/**
 * Renders a card and writes it next to wherever the run was started.
 *
 * @returns The file written, or the code that says why nothing was.
 */
const renderAndWrite = async (
  card: CardKind,
  query: Record<string, string>,
  config: CardConfig,
  out: string | undefined,
): Promise<{ written: string } | Failed> => {
  const rendered = await renderCard(card, query, config);
  if ('failed' in rendered) {
    return rendered;
  }

  const file = outFile(card, query, out);
  await writeFile(file, rendered.content, 'utf8');
  const written = relative(process.cwd(), file);
  process.stdout.write(`Wrote ${written}\n`);
  return { written };
};

/**
 * Renders a card and compares it with the file it would be written to, writing nothing.
 *
 * @returns Whether the file holds exactly this render, or why there was no render to compare.
 */
const renderAndCompare = async (
  card: CardKind,
  query: Record<string, string>,
  config: CardConfig,
  out: string | undefined,
): Promise<boolean | Failed> => {
  const rendered = await renderCard(card, query, config);
  if ('failed' in rendered) {
    return rendered;
  }

  const file = outFile(card, query, out);
  const shown = relative(process.cwd(), file);
  const current = existsSync(file) ? await readFile(file, 'utf8') : undefined;
  if (current !== rendered.content) {
    process.stderr.write(
      `${shown} ${current === undefined ? 'does not exist' : 'is out of date'}\n`,
    );
    return false;
  }

  process.stdout.write(`${shown} is up to date\n`);
  return true;
};

/**
 * Renders one card and writes it next to wherever the run was started.
 * Sets a non-zero exit code rather than throwing when it could not.
 *
 * @returns Nothing; the process exits non-zero when the card could not be rendered.
 */
const main = async (): Promise<void> => {
  const flags = readFlags();

  if (flags.help) {
    process.stdout.write(HELP);
    return;
  }
  if (flags.version) {
    // Same relative position from `src/` and from `build/`.
    const manifest = new URL('../package.json', import.meta.url);
    const { version } = JSON.parse(await readFile(manifest, 'utf8')) as {
      version: string;
    };
    process.stdout.write(`${version}\n`);
    return;
  }

  // An explicit `--env-file` must exist; the default one is a convenience.
  const envFile = flags['env-file'];
  loadEnvFile(envFile ?? DEFAULT_ENV_FILE, envFile !== undefined);

  // A saved file names its own card and carries its answers, so it skips both prompts.
  const saved =
    flags.config !== undefined && savedCardExists(flags.config)
      ? await readSavedCard(flags.config)
      : undefined;

  // A pasted query refines a saved card rather than replacing it, so one file
  // plus one option is a whole variant.
  const pasted = fromQueryString(flags.options ?? '');

  // `--check` is `--generate` that compares, so it takes the same path
  const generate = flags.generate || flags.check;

  if (generate && !saved) {
    throw new Error(
      `--${flags.check ? 'check' : 'generate'} renders a saved card, so it needs --config pointing at one.`,
    );
  }

  /*
   * Every other path asks something.
   * Without a terminal the prompt would hang on a stdin that never answers,
   * so say what to pass instead.
   */
  if (!generate && !flags['print-query'] && !process.stdin.isTTY) {
    throw new Error(
      'github-stats-forge asks questions, so it needs a terminal. Render a saved card instead: --config <file> --generate',
    );
  }

  if (saved && flags.card !== undefined && flags.card !== saved.card.id) {
    throw new Error(
      `${flags.config ?? ''} holds a ${saved.card.id} card, but --card asked for ${flags.card}.`,
    );
  }

  const card = saved?.card ?? (flags.card === undefined ? await pickCard() : findCard(flags.card));
  if (!card) {
    throw new Error(
      `No card called "${flags.card ?? ''}". Try one of: ${cards
        .map((known) => known.id)
        .join(', ')}`,
    );
  }

  // Nothing is fetched to print a query, so no token is asked for or needed.
  if (flags['print-query']) {
    process.stdout.write(`${toQueryString({ ...saved?.options, ...pasted })}\n`);
    return;
  }

  let tokens = resolveTokens(flags.pat, process.env);
  if (card.needsToken && tokens.length === 0 && generate) {
    throw new Error(
      `The ${card.id} card reads the GitHub API, so it needs a token. Pass --pat, or put PAT_1 in ${DEFAULT_ENV_FILE}.`,
    );
  }
  if (card.needsToken && tokens.length === 0) {
    const typed = await askToken();
    if (!typed) {
      throw new Error(
        `The ${card.id} card reads the GitHub API, so it needs a token. Pass --pat, or put PAT_1 in ${DEFAULT_ENV_FILE}.`,
      );
    }
    // core names a rejected token by this, starting a sentence
    tokens = [{ name: 'The token you typed', value: typed }];
  }

  const config = new CardConfig({
    pats: tokens,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    logger: stderrLogger,
    hints: {
      rate_limited:
        "Every token has hit GitHub's rate limit; try again later, or pass another with --pat",
      tokens_missing: `Pass --pat, or put PAT_1 in the environment or ${flags['env-file'] ?? DEFAULT_ENV_FILE}`,
    },
  });

  // `--generate` renders what the file holds and stops: no menu, nothing to answer.
  if (saved && flags.check) {
    const compared = await renderAndCompare(
      card,
      { ...saved.options, ...pasted },
      config,
      flags.out,
    );
    if (compared === false) {
      process.exitCode = 1;
    } else if (compared !== true) {
      process.exitCode = exitCodeFor(compared);
    }
    return;
  }
  if (saved && generate) {
    const outcome = await renderAndWrite(card, { ...saved.options, ...pasted }, config, flags.out);
    if ('failed' in outcome) {
      process.exitCode = exitCodeFor(outcome);
    }
    return;
  }

  const menu: Menu = {
    answers: await askRequired(card, toAnswers(card, { ...saved?.options, ...pasted })),
  };
  let savePath = flags.config;

  /*
   * The menu stays open after a render:
   * a card is rarely right the first time, and the whole point of the option
   * list is to change one thing and look again.
   */
  let status: string | undefined;
  let lastFailure: Failed | undefined;

  for (;;) {
    const action = await navigateOptions(card, menu, status);
    if (action === 'quit') {
      break;
    }

    const query = toQuery(menu.answers);

    if (action === 'print') {
      // The query is the result, so it goes to stdout on its own line, ready to pipe or copy.
      process.stdout.write(`${toQueryString(query)}\n`);
      status = 'printed the query — paste it into the action, or a card URL';
      continue;
    }

    if (action === 'save') {
      const path = savePath ?? (await askSavePath(`${cardFileStem(card, query)}-config.json`));
      if (path) {
        savePath = path;
        const written = await writeSavedCard(path, card, query);
        status = `saved ${relative(process.cwd(), written)} — load it again with --config`;
      }
      continue;
    }

    const outcome = await renderAndWrite(card, query, config, flags.out);
    if ('failed' in outcome) {
      // Left on the menu, since a rejected param is one edit away from working.
      status = `${outcome.failed} — fix it and generate again`;
      lastFailure = outcome;
      continue;
    }

    status = `wrote ${outcome.written} — edit an option and generate again`;
    lastFailure = undefined;
  }

  // Leaving straight after a failure still reports one.
  if (lastFailure) {
    process.exitCode = exitCodeFor(lastFailure);
  }
};

try {
  await main();
} catch (error) {
  // A cancelled prompt is a normal way to leave, not a crash.
  if (error instanceof Error && error.name === 'ExitPromptError') {
    process.exitCode = 130;
  } else {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
