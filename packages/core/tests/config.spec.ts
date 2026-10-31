/**
 * @file What `CardConfig.fromEnv` takes from an environment it does not own, a container's
 * being shared with whatever else runs beside it, and the deadline it puts on each request.
 */

import { describe, expect, it, vi } from 'vitest';

import { CardConfig } from '../src/common/config.ts';
import type { FetchLike } from '../src/common/http.ts';

/** A server that accepted the connection and then went quiet. */
const stalled: FetchLike = async (_input, init) =>
  new Promise((_resolve, reject) => {
    // the reason is a `DOMException`, which this realm does not count as an `Error`
    init?.signal?.addEventListener('abort', () => {
      reject(init.signal?.reason as Error);
    });
  });

describe('CardConfig.fromEnv', () => {
  it('reads the PAT_n names the CLI and the compose file write', () => {
    const config = CardConfig.fromEnv({ PAT_1: 'one', PAT_2: 'two', HOME: '/somewhere' });

    expect(config.pats).toStrictEqual([
      { name: 'PAT_1', value: 'one' },
      { name: 'PAT_2', value: 'two' },
    ]);
  });

  it('orders by name, whatever order the environment happens to hold them in', () => {
    const config = CardConfig.fromEnv({ PAT_3: 'three', PAT_1: 'one', PAT_2: 'two' });

    expect(config.pats.map((pat) => pat.name)).toStrictEqual(['PAT_1', 'PAT_2', 'PAT_3']);
  });

  it('skips an empty variable, docker compose writing `PAT_2=` for a blank token', () => {
    const config = CardConfig.fromEnv({ PAT_1: 'one', PAT_2: '' });

    expect(config.pats).toStrictEqual([{ name: 'PAT_1', value: 'one' }]);
  });

  it("leaves a neighbour's token alone, whatever it is suffixed with", () => {
    const config = CardConfig.fromEnv({
      PAT: 'x',
      PAT_: 'y',
      PAT_ONE: 'z',
      MY_PAT_1: 'mine',
      AZURE_PAT_1: 'azure',
      GH_PAT_1: 'gh',
    });

    expect(config.pats).toStrictEqual([]);
  });
});

describe('CardConfig.requestTimeoutMs', () => {
  it('gives up on a request that never answers', async () => {
    const config = new CardConfig({ fetch: stalled, requestTimeoutMs: 20 });

    await expect(config.fetch('https://api.github.com/graphql')).rejects.toMatchObject({
      name: 'TimeoutError',
    });
  });

  it('keeps what the request carried, adding the deadline', async () => {
    const transport = vi.fn<FetchLike>(async () => Promise.resolve(new Response('{}')));
    const config = new CardConfig({ fetch: transport, requestTimeoutMs: 1000 });

    await config.fetch('https://api.github.com/graphql', { method: 'POST', body: '{}' });

    const [input, init] = transport.mock.calls[0] ?? [];
    expect(input).toBe('https://api.github.com/graphql');
    expect(init).toMatchObject({ method: 'POST', body: '{}' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('hands the transport over untouched when unset', () => {
    expect(new CardConfig({ fetch: stalled }).fetch).toBe(stalled);
  });

  it('survives `with`, still around the transport it was given', async () => {
    const config = new CardConfig({ fetch: stalled, requestTimeoutMs: 20 }).with({ pats: [] });

    expect(config.requestTimeoutMs).toBe(20);
    await expect(config.fetch('https://api.github.com/graphql')).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    expect(config.with({ requestTimeoutMs: undefined }).fetch).toBe(stalled);
  });
});
