#!/usr/bin/env node
/**
 * @file Fails when a card cannot be drawn from the fictional account, as the anvil draws it.
 *
 * The fixtures are typed against core's queries; this is the behavioural half,
 * a card that cannot draw from what they answer. Needs no token, so it runs in CI.
 *
 * @returns Nothing; the process exits non-zero when a card did not draw.
 */

import { CardConfig, stats } from '@stats-forge/github-stats-forge-core/api';

import { CARDS } from '../src/anvil/cards.ts';
import { orNotFound, renderSampleCard } from '../src/anvil/render.ts';

/** Well under the 4.1s the retryer waits out a transport failure, so a draw that hit it is too slow. */
const AT_ONCE_MS = 1000;

/** @returns Why a request nothing answers did not draw GitHub's error at once, or `undefined`. */
const checkUnanswered = async (): Promise<string | undefined> => {
  const config = new CardConfig({
    pats: [{ name: 'ANVIL', value: 'sample' }],
    fetch: orNotFound(async () => Promise.reject(new Error('No fixture'))),
  });

  // core logs GitHub's error as it reads it, which is the expected outcome here
  const { error } = console;
  console.error = (): void => undefined;
  const started = performance.now();
  try {
    const result = await stats({ username: 'octocat' }, config);
    const took = performance.now() - started;
    if (result.status !== 'error' || result.error.code !== 'not_found') {
      return 'an unanswered request did not draw the not-found card';
    }
    if (took > AT_ONCE_MS) {
      return `an unanswered request took ${String(Math.round(took))}ms, waiting out the retryer`;
    }
    return undefined;
  } finally {
    console.error = error;
  }
};

const main = async (): Promise<void> => {
  const failures: Array<string> = [];

  for (const card of CARDS) {
    const result = await renderSampleCard(card.id, { ...card.identity, ...card.maximal });

    if (result.status === 'error') {
      failures.push(`${card.id}: ${result.error.message} (${result.error.code})`);
    } else if (!result.content.startsWith('<svg')) {
      failures.push(`${card.id}: drew something that is not an SVG`);
    }
    process.stderr.write(`  ${result.status === 'error' ? '✗' : '✓'} ${card.id}\n`);
  }

  if (failures.length > 0) {
    process.stderr.write(`\n${String(failures.length)} card(s) did not draw from the fixtures:\n`);
    for (const failure of failures) {
      process.stderr.write(`  ${failure}\n`);
    }
    process.stderr.write('\nAnswer each request in apps/docs/src/anvil/fixtures.ts\n');
    process.exitCode = 1;
  }

  const unanswered = await checkUnanswered();
  process.stderr.write(`  ${unanswered === undefined ? '✓' : '✗'} an unanswered request\n`);
  if (unanswered !== undefined) {
    process.stderr.write(`\n${unanswered}: see orNotFound in apps/docs/src/anvil/render.ts\n`);
    process.exitCode = 1;
  }
};

await main();
