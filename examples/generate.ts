#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

/**
 * @file Renders every card in `examples/cards` and indexes them in one markdown file.
 *
 * Each JSON file is a saved card: the `{ card, options }` shape the CLI's `--config` loads.
 * A preview is therefore made the way anyone else would make one — through the CLI.
 */

const EXAMPLES_DIR = import.meta.dirname;
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const CARDS_DIR = join(EXAMPLES_DIR, 'cards');
const PREVIEWS_DIR = join(EXAMPLES_DIR, 'previews');
const CLI = join(REPO_ROOT, 'packages', 'cli', 'build', 'index.js');

/** A saved card, as the files in `cards/` hold it. */
interface SavedCard {
  card: string;
  options: Record<string, string>;
}

/** One example, and how it last fared. */
interface Preview {
  name: string;
  saved: SavedCard;
  /** Why this run could not render it. */
  error?: string;
  /** Whether an SVG is there to show, from this run or an earlier one. */
  rendered: boolean;
}

/** What the command line can carry: the flags, then the example names. */
interface Flags {
  values: { pat: Array<string>; 'env-file'?: string };
  positionals: Array<string>;
}

/**
 * @returns The flags and example names this run was given.
 */
const readFlags = (): Flags =>
  parseArgs({
    options: {
      pat: { type: 'string', multiple: true, default: [] },
      'env-file': { type: 'string' },
    },
    allowPositionals: true,
  });

/**
 * Renders one saved card into `examples/previews`.
 *
 * The CLI runs from the repository root, so it finds the root `.env` on its own.
 *
 * @returns Nothing when it rendered, or why it did not.
 */
const renderPreview = (name: string, passthrough: Array<string>): Promise<string | undefined> => {
  const args = [
    CLI,
    '--config',
    join(CARDS_DIR, `${name}.json`),
    '--generate',
    '--out',
    join(PREVIEWS_DIR, `${name}.svg`),
    ...passthrough,
  ];

  return new Promise((settle) => {
    const cli = spawn(process.execPath, args, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'inherit', 'pipe'],
    });

    // Teed rather than inherited: the failure is shown as it happens and quoted later.
    let stderr = '';
    cli.stderr.setEncoding('utf8');
    cli.stderr.on('data', (chunk: string) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });

    cli.on('close', (code) => {
      if (code === 0) {
        settle(undefined);
        return;
      }
      settle(stderr.trim() || `the CLI exited with code ${String(code)}`);
    });
  });
};

/**
 * @returns Them as one line of inline code.
 */
const describeOptions = (options: Record<string, string>): string =>
  Object.entries(options)
    .map(([name, value]) => `\`${name}=${value}\``)
    .join(' · ');

/**
 * Writes the file that shows every preview at once.
 *
 * It covers every saved card, not only the ones this run redrew,
 * so rendering a single example does not empty the index of the rest.
 *
 * @returns The file written.
 */
const writeIndex = async (previews: Array<Preview>): Promise<string> => {
  const sections = previews.map(({ name, saved, error, rendered }) => {
    let body: string;
    if (error !== undefined) {
      body = `> Did not render:\n>\n> \`\`\`\n> ${error.split('\n').join('\n> ')}\n> \`\`\``;
    } else if (rendered) {
      body = `![${name}](./${name}.svg)`;
    } else {
      body = `> Not rendered yet — \`pnpm examples ${name}\``;
    }

    return [
      `## ${name}`,
      '',
      body,
      '',
      `The \`${saved.card}\` card from [\`cards/${name}.json\`](../cards/${name}.json) — ${describeOptions(saved.options)}`,
      '',
    ].join('\n');
  });

  // Named README.md so that opening the folder shows the previews.
  const file = join(PREVIEWS_DIR, 'README.md');
  await writeFile(
    file,
    [
      '# Card previews',
      '',
      'Rendered by `pnpm examples` from the saved cards in [`../cards`](../cards).',
      'Edit one of those files and run `pnpm examples <name>` to redraw just that card.',
      '',
      ...sections,
    ].join('\n'),
    'utf8',
  );
  return file;
};

/**
 * Sets a non-zero exit code rather than throwing when a card could not be rendered.
 *
 * @returns Nothing; the process exits non-zero when a card could not be rendered.
 */
const main = async (): Promise<void> => {
  const { values, positionals } = readFlags();

  if (!existsSync(CLI)) {
    throw new Error(`No CLI at ${relative(REPO_ROOT, CLI)}. Build it first: pnpm build:packages`);
  }

  const cardFiles = await readdir(CARDS_DIR);
  const available = cardFiles
    .filter((file) => file.endsWith('.json'))
    .map((file) => basename(file, '.json'))
    .toSorted();

  const unknown = positionals.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    throw new Error(
      `No example called ${unknown.map((name) => `"${name}"`).join(', ')}. Try one of: ${available.join(', ')}`,
    );
  }
  const wanted = positionals.length > 0 ? positionals : available;

  const passthrough = [
    ...values.pat.flatMap((pat) => ['--pat', pat]),
    ...(values['env-file'] === undefined ? [] : ['--env-file', values['env-file']]),
  ];

  await mkdir(PREVIEWS_DIR, { recursive: true });

  // One at a time: parallel runs would interleave their output and share a rate limit.
  const previews: Array<Preview> = [];
  for (const name of available) {
    const saved = JSON.parse(await readFile(join(CARDS_DIR, `${name}.json`), 'utf8')) as SavedCard;
    const error = wanted.includes(name) ? await renderPreview(name, passthrough) : undefined;
    const rendered = existsSync(join(PREVIEWS_DIR, `${name}.svg`));
    previews.push(
      error === undefined ? { name, saved, rendered } : { name, saved, error, rendered },
    );
  }

  const index = await writeIndex(previews);
  const failed = previews.filter((preview) => preview.error !== undefined);
  process.stdout.write(
    `${wanted.length - failed.length}/${wanted.length} rendered — see ${relative(REPO_ROOT, index)}\n`,
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

try {
  await main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
