#!/usr/bin/env node
/**
 * @file Renders every card the documentation shows, once per site theme — through the CLI, the
 * way anyone else would, with its `fetch` answered by the fictional account in `fixtures.ts`.
 *
 * Each file in `cards/` is a saved card minus the theme, which is merged in here rather than kept
 * in two near-identical files. A theme sample names its own theme, so it is rendered once.
 *
 * The fixtures make the output deterministic, so `--check` fails when a committed SVG differs from
 * what this would write — which is what CI runs.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { CARD_THEMES, SAMPLE_CARD, SAMPLE_THEMES, THEMES_DIR } from '../src/constants.ts';
import type { CardMode } from '../src/constants.ts';

const DOCS_DIR = fileURLToPath(new URL('..', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const CARDS_DIR = join(DOCS_DIR, 'cards');
const OUT_DIR = join(DOCS_DIR, 'public', 'cards');
const THEMES_OUT_DIR = join(DOCS_DIR, 'public', THEMES_DIR);
const CLI = join(REPO_ROOT, 'packages', 'cli', 'build', 'index.js');
const FIXTURE_FETCH = fileURLToPath(new URL('fixture-fetch.ts', import.meta.url));

/** A saved card, as the files in `cards/` hold it: every option on the root. */
interface SavedCard extends Record<string, string | number> {
  version: number;
  card: string;
}

/**
 * Runs from the site's directory, which holds no `.env`, with a placeholder token: the fixtures
 * answer every request, so no real token is needed or read.
 *
 * @returns Nothing when it rendered, or why it did not.
 */
const render = (config: string, out: string, quiet: boolean): Promise<string | undefined> => {
  const args = ['--import', FIXTURE_FETCH, CLI, '--config', config, '--generate', '--out', out];

  return new Promise((resolve) => {
    const cli = spawn(process.execPath, args, {
      cwd: DOCS_DIR,
      env: { ...process.env, PAT_1: 'fixture' },
      stdio: ['ignore', quiet ? 'ignore' : 'inherit', 'pipe'],
    });

    // Teed rather than inherited: the failure is shown as it happens and quoted later.
    let stderr = '';
    cli.stderr.setEncoding('utf8');
    cli.stderr.on('data', (chunk: string) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });

    cli.on('close', (code) => {
      resolve(code === 0 ? undefined : stderr.trim() || `the CLI exited with code ${String(code)}`);
    });
  });
};

/** @returns Nothing; the process exits non-zero when a card could not be rendered. */
const main = async (): Promise<void> => {
  const { values, positionals } = parseArgs({
    options: { check: { type: 'boolean', default: false } },
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

  const scratch = await mkdtemp(join(tmpdir(), 'stats-forge-docs-'));
  const failures: Array<string> = [];

  /** A failure is collected rather than thrown, so one bad card does not stop the rest. */
  const renderThemed = async (
    saved: SavedCard,
    theme: string,
    out: string,
    label: string,
  ): Promise<void> => {
    const slug = label.replaceAll(/\W/g, '-');
    const config = join(scratch, `${slug}.json`);
    await writeFile(config, JSON.stringify({ ...saved, theme }), 'utf8');

    // under --check the card is drawn beside the committed one and compared, never written over it
    const target = values.check ? join(scratch, `${slug}.svg`) : out;
    const error = await render(config, target, values.check);
    if (error !== undefined) {
      failures.push(`${label}: ${error}`);
      return;
    }

    if (values.check) {
      const committed = await readFile(out, 'utf8').catch(() => '');
      if (committed !== (await readFile(target, 'utf8'))) {
        failures.push(`${label}: ${relative(DOCS_DIR, out)} is out of date`);
      }
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
    process.stderr.write(`\n${String(failures.length)} card(s) did not render or drifted:\n`);
    for (const failure of failures) {
      process.stderr.write(`  ${failure}\n`);
    }
    if (values.check) {
      process.stderr.write('\nRedraw them: pnpm docs:cards\n');
    }
    process.exitCode = 1;
  }
};

await main();
