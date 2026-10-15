#!/usr/bin/env node
/**
 * @file Writes the samples the anvil replays, from the fictional account in `fixtures.ts`.
 *
 * The anvil's own render path with the transport swapped — same handlers, a `fetch` that answers
 * from the fixtures — so a sample cannot be of a request the anvil does not make. `--check` fails
 * when `samples.json` differs from what this would write, which is what CI runs.
 *
 * Written through oxfmt, as the other generators are, so `pnpm format` leaves it alone.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { defineConfig } from '@marcalexiei/oxfmt-config';
import { CardConfig } from '@stats-forge/github-stats-forge-core/api';
import type { FetchLike } from '@stats-forge/github-stats-forge-core/api';
import { format } from 'oxfmt';

import { CARDS } from '../src/anvil/cards.ts';
import type { Samples } from '../src/anvil/sample-fetch.ts';
import { sampleKey } from '../src/anvil/sample-key.ts';

import { fixtureFetch } from './fixtures.ts';

const OUT = fileURLToPath(new URL('../src/anvil/samples.json', import.meta.url));

/**
 * Read as text and re-wrapped, because a `Response` body is consumed once and core is about to.
 *
 * @returns The transport, and the map it fills as requests go through it.
 */
const samplingFetch = (): { fetch: FetchLike; samples: Samples } => {
  const samples: Samples = {};

  const fetchImpl: FetchLike = async (url, init) => {
    const response = await fixtureFetch(url, init);
    const text = await response.text();

    const key = sampleKey(url, init);
    if (key !== undefined) {
      samples[key] = { status: response.status, body: JSON.parse(text) as unknown };
    }

    return new Response(text, { status: response.status, statusText: response.statusText });
  };

  return { fetch: fetchImpl, samples };
};

/** @returns Nothing; the process exits non-zero when a card did not render or the file drifted. */
const main = async (): Promise<void> => {
  const { values } = parseArgs({ options: { check: { type: 'boolean', default: false } } });

  const { fetch: sampler, samples } = samplingFetch();
  const config = new CardConfig({
    pats: [{ name: 'ANVIL', value: 'sample' }],
    fetch: sampler,
  });

  const failures: Array<string> = [];

  for (const card of CARDS) {
    const result = await card.render({ ...card.identity, ...card.maximal }, config);

    if (result.status === 'error') {
      failures.push(`${card.id}: ${result.error.message} (${result.error.code})`);
    }
    process.stderr.write(`  ${result.status === 'error' ? '✗' : '✓'} ${card.id}\n`);
  }

  const ordered = Object.fromEntries(
    Object.entries(samples).toSorted(([a], [b]) => a.localeCompare(b)),
  );
  const formatted = await format(OUT, `${JSON.stringify(ordered, undefined, 2)}\n`, defineConfig());

  if (values.check) {
    const current = await readFile(OUT, 'utf8').catch(() => '');
    if (current !== formatted.code) {
      failures.push(
        'samples.json is out of date: pnpm --filter ./apps/docs run generate-anvil-samples',
      );
    }
  } else {
    await writeFile(OUT, formatted.code, 'utf8');
    process.stderr.write(`\nWrote ${String(Object.keys(ordered).length)} operation(s).\n`);
  }

  if (failures.length > 0) {
    process.stderr.write(`\n${String(failures.length)} problem(s):\n`);
    for (const failure of failures) {
      process.stderr.write(`  ${failure}\n`);
    }
    process.exitCode = 1;
  }
};

await main();
