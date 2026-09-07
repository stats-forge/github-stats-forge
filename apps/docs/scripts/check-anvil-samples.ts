#!/usr/bin/env node
import { CARDS } from '../src/anvil/cards.ts';
import { renderSampleCard } from '../src/anvil/render.ts';

/**
 * @file Fails when a card cannot be drawn from the recorded samples.
 *
 * Nothing types the recording against core's GraphQL types, so the guard is behavioural: change a
 * query's shape and a card stops drawing. Needs no token, so unlike the recorder it runs in CI.
 *
 * @returns Nothing; the process exits non-zero when a card did not draw.
 */
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
    process.stderr.write(`\n${String(failures.length)} card(s) did not draw from the samples:\n`);
    for (const failure of failures) {
      process.stderr.write(`  ${failure}\n`);
    }
    process.stderr.write('\nRe-record them: pnpm --filter ./apps/docs run record-anvil-samples\n');
    process.exitCode = 1;
  }
};

await main();
