/**
 * @file A deployment pinned to its owner, and what it refuses: a rejection has to happen before
 * any request reaches GitHub, and every card has to declare which of its params is the identity.
 */

import { describe, expect, it } from 'vitest';

import type { ApiResult } from '../src/api/api-result.ts';
import { contributedTo } from '../src/api/contributed-to.ts';
import { gist } from '../src/api/gist.ts';
import * as api from '../src/api/index.ts';
import { org } from '../src/api/organization.ts';
import { pin } from '../src/api/pin.ts';
import { stats } from '../src/api/stats.ts';
import { topLangs } from '../src/api/top-langs.ts';
import { wakatime } from '../src/api/wakatime.ts';
import { CardConfig } from '../src/common/config.ts';

import { FetchMock } from './_fetch-mock.ts';

const OWNER = 'marcalexiei';
const GIST_ID = '1f13e82cb48a9058ebcbf4945f5a1c20';

/** A transport that fails the test if anything reaches it: a refusal must cost no request. */
const noRequests = new FetchMock();

const pinned = new CardConfig({
  pats: [{ name: 'PAT_1', value: 'token' }],
  usernameAllowlist: [OWNER],
  gistAllowlist: [GIST_ID],
  fetch: noRequests.fetch,
});

/** One card, the param that identifies whose card it is, and whatever else it needs to render. */
interface GuardedCard {
  name: string;
  render: ((query: Record<string, string>, config: CardConfig) => Promise<ApiResult>) & {
    IDENTITIES: object;
  };
  param: string;
  extra: Record<string, string>;
}

/** Every card an allowlist guards. The wakatime card is the one that is not; see below. */
const GUARDED: ReadonlyArray<GuardedCard> = [
  { name: 'stats', render: stats, param: 'username', extra: {} },
  { name: 'top-langs', render: topLangs, param: 'username', extra: {} },
  { name: 'contributed-to', render: contributedTo, param: 'username', extra: {} },
  { name: 'pin', render: pin, param: 'username', extra: { repo: 'some-repo' } },
  { name: 'org', render: org, param: 'org', extra: {} },
  { name: 'gist', render: gist, param: 'id', extra: {} },
];

describe('a deployment pinned by ALLOWLIST', () => {
  it.each(GUARDED)('refuses an identity $name is not configured to draw', async (card) => {
    const query = { ...card.extra, [card.param]: 'someone-else' };

    const result = await card.render(query, pinned);

    expect(result).toMatchObject({
      status: 'error',
      retryable: false,
      error: { code: 'not_allowed', param: card.param },
    });
    // the refusal happens at the boundary, so it spends no rate-limit point
    expect(noRequests.history.post).toHaveLength(0);
    expect(noRequests.history.get).toHaveLength(0);
  });

  it.each(GUARDED)('does not echo the rejected value back to the caller of $name', async (card) => {
    const secret = 'some-private-account';

    const result = await card.render({ ...card.extra, [card.param]: secret }, pinned);

    expect(result.content).not.toContain(secret);
  });

  it('matches a login case-insensitively, GitHub logins being case-insensitive', async () => {
    const result = await stats({ username: OWNER.toUpperCase() }, pinned);

    // allowed, so it gets as far as the transport and fails there instead
    expect(result).toMatchObject({ status: 'error', error: { code: 'upstream' } });
  });

  it('reads a human-formatted list, spaces after the commas included', () => {
    const config = CardConfig.fromEnv({ ALLOWLIST: 'alice, bob,, carol ' });

    expect(config.usernameAllowlist).toStrictEqual(['alice', 'bob', 'carol']);
    expect(config.isAllowed('bob', 'username')).toBe(true);
  });

  it('serves anyone when no list is configured', async () => {
    const open = new CardConfig({
      pats: [{ name: 'PAT_1', value: 'token' }],
      fetch: noRequests.fetch,
    });

    const result = await stats({ username: 'anuraghazra' }, open);

    expect(result).not.toMatchObject({ error: { code: 'not_allowed' } });
  });

  it('guards the gist card with its own list, not the username one', async () => {
    const result = await gist({ id: 'a-different-gist' }, pinned);

    expect(result).toMatchObject({ error: { code: 'not_allowed', param: 'id' } });
  });
});

describe('what each card declares as its identity', () => {
  it.each(GUARDED)('$name pins $param', (card) => {
    expect(card.render.IDENTITIES).toHaveProperty(card.param);
  });

  // from core's own exports rather than `GUARDED`, so a card forgotten here is still caught
  it('is declared by every card core exports', () => {
    const undeclared = Object.entries<unknown>(api)
      .filter(([, value]) => typeof value === 'function' && 'IDENTITIES' in value)
      .filter(([name, value]) => {
        const { IDENTITIES } = value as { IDENTITIES: object };
        return name !== 'wakatime' && Object.keys(IDENTITIES).length === 0;
      })
      .map(([name]) => name);

    expect(undeclared).toStrictEqual([]);
  });

  // deliberate, not forgotten: asserted so that changing it takes an edit here
  it('leaves the wakatime card open, its username being another service’s', () => {
    expect(wakatime.IDENTITIES).toStrictEqual({});
  });
});
