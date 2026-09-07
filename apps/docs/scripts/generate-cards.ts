#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { CARD_THEMES, SAMPLE_CARD, SAMPLE_THEMES, THEMES_DIR } from '../src/constants.ts';
import type { CardMode } from '../src/constants.ts';

/**
 * @file Renders every card the documentation shows, once per site theme — through the CLI, the
 * way anyone else would.
 *
 * Each file in `cards/` is a saved card minus the theme, which is merged in here rather than kept
 * in two near-identical files. A theme sample names its own theme, so it is rendered once.
 */

const DOCS_DIR = fileURLToPath(new URL('..', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const CARDS_DIR = join(DOCS_DIR, 'cards');
const OUT_DIR = join(DOCS_DIR, 'public', 'cards');
const THEMES_OUT_DIR = join(DOCS_DIR, 'public', THEMES_DIR);
const CLI = join(REPO_ROOT, 'packages', 'cli', 'build', 'index.js');

/** A saved card, as the files in `cards/` hold it. */
interface SavedCard {
  card: string;
  options: Record<string, string>;
}

/**
 * Runs from the repository root, so the CLI finds the root `.env` on its own.
 *
 * @returns Nothing when it rendered, or why it did not.
 */
const render = (
  config: string,
  out: string,
  passthrough: Array<string>,
): Promise<string | undefined> => {
  const args = [CLI, '--config', config, '--generate', '--out', out, ...passthrough];

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
      settle(code === 0 ? undefined : stderr.trim() || `the CLI exited with code ${String(code)}`);
    });
  });
};

/** @returns Nothing; the process exits non-zero when a card could not be rendered. */
const main = async (): Promise<void> => {
  const { values, positionals } = parseArgs({
    options: {
      pat: { type: 'string', multiple: true, default: [] },
      'env-file': { type: 'string' },
    },
    allowPositionals: true,
  });

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
      `No card called ${unknown.map((name) => `"${name}"`).join(', ')}. Try one of: ${available.join(', ')}`,
    );
  }
  const wanted = positionals.length > 0 ? positionals : available;

  const passthrough = [
    ...values.pat.flatMap((pat) => ['--pat', pat]),
    ...(values['env-file'] === undefined ? [] : ['--env-file', values['env-file']]),
  ];

  const scratch = await mkdtemp(join(tmpdir(), 'stats-forge-docs-'));
  const failures: Array<string> = [];

  /** A failure is collected rather than thrown, so one bad card does not stop the rest. */
  const renderThemed = async (
    saved: SavedCard,
    theme: string,
    out: string,
    label: string,
  ): Promise<void> => {
    const config = join(scratch, `${label.replaceAll(/\W/g, '-')}.json`);
    await writeFile(
      config,
      JSON.stringify({ ...saved, options: { ...saved.options, theme } }),
      'utf8',
    );

    const error = await render(config, out, passthrough);
    if (error !== undefined) {
      failures.push(`${label}: ${error}`);
    }
  };

  /** @returns The saved card that file holds. */
  const readCard = async (name: string): Promise<SavedCard> =>
    JSON.parse(await readFile(join(CARDS_DIR, `${name}.json`), 'utf8')) as SavedCard;

  for (const name of wanted) {
    const saved = await readCard(name);

    for (const [mode, theme] of Object.entries(CARD_THEMES) as Array<[CardMode, string]>) {
      await renderThemed(saved, theme, join(OUT_DIR, `${name}-${mode}.svg`), `${name} (${mode})`);
    }
  }

  // The theme page's samples, only when this run covered the card they draw.
  if (wanted.includes(SAMPLE_CARD)) {
    const saved = await readCard(SAMPLE_CARD);
    for (const theme of SAMPLE_THEMES) {
      await renderThemed(saved, theme, join(THEMES_OUT_DIR, `${theme}.svg`), `theme ${theme}`);
    }
  }

  if (failures.length > 0) {
    process.stderr.write(`\n${String(failures.length)} card(s) did not render:\n`);
    for (const failure of failures) {
      process.stderr.write(`  ${failure}\n`);
    }
    process.exitCode = 1;
  }
};

await main();
