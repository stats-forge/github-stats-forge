#!/usr/bin/env node
/**
 * @file Fails when a card cannot be drawn from the samples, replayed as the browser replays them.
 *
 * The fixtures behind the samples are typed against core's queries; this is the behavioural half,
 * a card that cannot draw from what they answer. Needs no token, so it runs in CI.
 *
 * @returns Nothing; the process exits non-zero when a card did not draw.
 */

import { CARDS } from '../src/anvil/cards.ts';
import { renderSampleCard } from '../src/anvil/render.ts';

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
    process.stderr.write(
      '\nRegenerate them: pnpm --filter ./apps/docs run generate-anvil-samples\n',
    );
    process.exitCode = 1;
  }
};

await main();
