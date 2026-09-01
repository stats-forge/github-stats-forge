#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { CardConfig } from '@stats-forge/github-stats-forge-core/api';

import type { CardKind } from './cards.js';
import { cards, findCard } from './cards.js';
import type { Menu } from './prompts.js';
import { askRequired, askSavePath, askToken, navigateOptions, pickCard } from './prompts.js';
import { defaultFileName, toQuery } from './query.js';
import { readSavedCard, savedCardExists, toAnswers, writeSavedCard } from './saved-card.js';
import { withSpinner } from './spinner.js';
import { DEFAULT_ENV_FILE, loadEnvFile, resolveTokens } from './tokens.js';

const HELP = `github-stats-forge — render a GitHub stats card to a local SVG

Usage
  github-stats-forge [options]

Options
  -c, --card <id>       Skip the card prompt: ${cards.map((card) => card.id).join(', ')}
  -o, --out <file>      Where to write the card (default: named after the card)
      --config <file>   Options to load, and where "Save these options" writes
  -g, --generate        Render what --config holds and exit, without the menu
      --pat <token>     GitHub token; repeat for several
      --env-file <file> Env file to read PAT_1, PAT_2, … from (default: ${DEFAULT_ENV_FILE})
  -h, --help            Show this
  -v, --version         Show the version

The token can also come from PAT_1 in the environment, or be typed when asked.
`;

/**
 * @returns The flags this run was given.
 */
const readFlags = () =>
  parseArgs({
    options: {
      card: { type: 'string', short: 'c' },
      out: { type: 'string', short: 'o' },
      config: { type: 'string' },
      generate: { type: 'boolean', short: 'g', default: false },
      pat: { type: 'string', multiple: true, default: [] },
      'env-file': { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
    allowPositionals: false,
  }).values;

/**
 * Renders a card and writes it next to wherever the run was started.
 *
 * @param card The card to render.
 * @param query Its params.
 * @param config Tokens the fetchers use.
 * @param out Where to write it; named after the card when absent.
 * @returns The file written, or the code that says why nothing was.
 */
const renderAndWrite = async (
  card: CardKind,
  query: Record<string, string>,
  config: CardConfig,
  out: string | undefined,
): Promise<{ written: string } | { failed: string }> => {
  const result = await withSpinner(`Rendering the ${card.id} card`, () =>
    card.render(query, config),
  );

  if (result.status === 'error') {
    const { code, message, secondaryMessage, param } = result.error;
    process.stderr.write(
      [
        `Could not render the ${card.id} card.`,
        `  ${message}${secondaryMessage ? `: ${secondaryMessage}` : ''}`,
        `  code: ${code}${param ? `, param: ${param}` : ''}`,
        result.retryable ? '  This one may work on a retry.' : '',
      ]
        .filter(Boolean)
        .join('\n') + '\n',
    );
    return { failed: code };
  }

  const file = resolve(process.cwd(), out ?? defaultFileName(card, query));
  await writeFile(file, result.content, 'utf8');
  const written = relative(process.cwd(), file);
  process.stdout.write(`Wrote ${written}\n`);
  return { written };
};

/**
 * Renders one card and writes it next to wherever the run was started.
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

  if (flags.generate && !saved) {
    throw new Error('--generate renders a saved card, so it needs --config pointing at one.');
  }

  /*
   * Every other path asks something.
   * Without a terminal the prompt would hang on a stdin that never answers,
   * so say what to pass instead.
   */
  if (!flags.generate && !process.stdin.isTTY) {
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

  let tokens = resolveTokens(flags.pat, process.env);
  if (card.needsToken && tokens.length === 0 && flags.generate) {
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
    tokens = [{ name: 'prompt', value: typed }];
  }

  const config = new CardConfig({ pats: tokens });

  // `--generate` renders what the file holds and stops: no menu, nothing to answer.
  if (saved && flags.generate) {
    const outcome = await renderAndWrite(card, saved.params, config, flags.out);
    if ('failed' in outcome) {
      process.exitCode = 1;
    }
    return;
  }

  const menu: Menu = {
    answers: saved ? toAnswers(card, saved.params) : await askRequired(card),
  };
  let savePath = flags.config;

  /*
   * The menu stays open after a render:
   * a card is rarely right the first time, and the whole point of the option
   * list is to change one thing and look again.
   */
  let status: string | undefined;
  let lastFailed = false;

  for (;;) {
    const action = await navigateOptions(card, menu, status);
    if (action === 'quit') {
      break;
    }

    const query = toQuery(menu.answers);

    if (action === 'save') {
      const path =
        savePath ?? (await askSavePath(defaultFileName(card, query).replace(/\.svg$/, '.json')));
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
      lastFailed = true;
      continue;
    }

    status = `wrote ${outcome.written} — edit an option and generate again`;
    lastFailed = false;
  }

  // Leaving straight after a failure still reports one.
  if (lastFailed) {
    process.exitCode = 1;
  }
};

try {
  await main();
} catch (err) {
  // A cancelled prompt is a normal way to leave, not a crash.
  if (err instanceof Error && err.name === 'ExitPromptError') {
    process.exitCode = 130;
  } else {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}
