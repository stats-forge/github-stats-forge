#!/usr/bin/env node
/**
 * @file Records what GitHub answers each card's requests with, once, for the anvil to replay.
 *
 * The anvil's own render path with the transport reversed — same handlers, a `fetch` that reaches
 * the network — so a recording cannot be of a request the anvil does not make.
 *
 * Needs `PAT_1` in the root `.env`, so the output is committed and CI runs `check-anvil-samples`
 * instead. Written through oxfmt, as the other generators are, so `pnpm format` leaves it alone.
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { oxfmtConfig } from '@marcalexiei/oxfmt-config';
import { CardConfig } from '@stats-forge/github-stats-forge-core/api';
import type { FetchLike } from '@stats-forge/github-stats-forge-core/api';
import { format } from 'oxfmt';

import { CARDS } from '../src/anvil/cards.ts';
import type { Samples } from '../src/anvil/sample-fetch.ts';
import { sampleKey } from '../src/anvil/sample-key.ts';

const OUT = fileURLToPath(new URL('../src/anvil/samples.json', import.meta.url));

/**
 * Read as text and re-wrapped, because a `Response` body is consumed once and core is about to.
 *
 * @returns The transport, and the map it fills as requests go through it.
 */
const recordingFetch = (): { fetch: FetchLike; samples: Samples } => {
  const samples: Samples = {};

  const fetchImpl: FetchLike = async (url, init) => {
    const response = await fetch(url, init);
    const text = await response.text();

    const key = sampleKey(url, init);
    if (key !== undefined) {
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      samples[key] = { status: response.status, body };
    }

    return new Response(text, { status: response.status, statusText: response.statusText });
  };

  return { fetch: fetchImpl, samples };
};

/** @returns Nothing; the process exits non-zero when a card did not render. */
const main = async (): Promise<void> => {
  const token = process.env['PAT_1'];
  if (token === undefined || token === '') {
    throw new Error('No PAT_1. Put one in the repository root .env, as pnpm docs:cards needs.');
  }

  const { fetch: recorder, samples } = recordingFetch();
  const config = new CardConfig({
    pats: [{ name: 'PAT_1', value: token }],
    fetch: recorder,
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
  const formatted = await format(OUT, `${JSON.stringify(ordered, undefined, 2)}\n`, oxfmtConfig);
  await writeFile(OUT, formatted.code, 'utf8');
  process.stderr.write(`\nRecorded ${String(Object.keys(ordered).length)} operation(s).\n`);

  if (failures.length > 0) {
    process.stderr.write(`\n${String(failures.length)} card(s) did not render:\n`);
    for (const failure of failures) {
      process.stderr.write(`  ${failure}\n`);
    }
    process.exitCode = 1;
  }
};

await main();
