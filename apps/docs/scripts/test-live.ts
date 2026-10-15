#!/usr/bin/env node
/**
 * @file Draws every card against the real GitHub and WakaTime APIs, and fails on any that does not.
 *
 * Everything else here runs on made-up data — core's and the server's tests mock `fetch`, and the
 * site's samples and previews come from `fixtures.ts` — so this is the one check
 * that the live APIs still answer the way core reads them. Each card is drawn with the anvil's
 * `maximal` options, so every request a card can make is made. Only success is asserted: live
 * numbers drift, so the output is never compared.
 *
 * Needs `PAT_1`; `pnpm test:live` reads it from the root `.env`, and
 * `.github/workflows/test-live.yml` from the `LIVE_TEST_PAT` secret of the `test-live` environment. The accounts default to the
 * project's own and each has an override.
 */

import { CardConfig } from '@stats-forge/github-stats-forge-core/api';

import { CARDS } from '../src/anvil/cards.ts';

/** Each identity param, as a real account to draw it for. */
const ACCOUNTS: Readonly<Record<string, string>> = {
  username: process.env['LIVE_TEST_USER'] ?? 'marcalexiei',
  repo: process.env['LIVE_TEST_REPO'] ?? 'eslint-zod',
  id: process.env['LIVE_TEST_GIST'] ?? '1f13e82cb48a9058ebcbf4945f5a1c20',
  org: process.env['LIVE_TEST_ORG'] ?? 'stats-forge',
};

/** A WakaTime profile is not a GitHub login, so it has its own. */
const WAKATIME_USER = process.env['LIVE_TEST_WAKATIME'] ?? 'ffflabs';

/** @returns The query naming the real account, for each param that identifies one. */
const identityOf = (cardId: string, params: ReadonlyArray<string>): Record<string, string> =>
  Object.fromEntries(
    params.map((name) => [
      name,
      cardId === 'wakatime' && name === 'username' ? WAKATIME_USER : (ACCOUNTS[name] ?? ''),
    ]),
  );

/** @returns Nothing; the process exits non-zero when a card did not draw. */
const main = async (): Promise<void> => {
  const token = process.env['PAT_1'];
  if (token === undefined || token === '') {
    throw new Error(
      'No PAT_1. Put one in the repository root .env, or in the LIVE_TEST_PAT secret of the test-live environment.',
    );
  }

  const config = new CardConfig({ pats: [{ name: 'PAT_1', value: token }] });
  const failures: Array<string> = [];

  for (const card of CARDS) {
    const query = {
      ...card.maximal,
      ...identityOf(
        card.id,
        card.required.map(({ name }) => name),
      ),
    };
    const started = performance.now();
    const result = await card.render(query, config);
    const took = `${String(Math.round(performance.now() - started))}ms`;

    if (result.status === 'error') {
      const { code, message, param } = result.error;
      failures.push(`${card.id}: ${code}${param ? ` (${param})` : ''} — ${message}`);
      process.stderr.write(`  ✗ ${card.id} ${code} ${took}\n`);
    } else if (result.content.startsWith('<svg')) {
      process.stderr.write(`  ✓ ${card.id} ${took}\n`);
    } else {
      failures.push(`${card.id}: drew something that is not an SVG`);
      process.stderr.write(`  ✗ ${card.id} ${took}\n`);
    }
  }

  if (failures.length > 0) {
    process.stderr.write(`\n${String(failures.length)} card(s) did not draw from live data:\n`);
    for (const failure of failures) {
      process.stderr.write(`  ${failure}\n`);
    }
    process.exitCode = 1;
  }
};

await main();
