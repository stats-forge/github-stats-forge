import type { FetchLike } from '@stats-forge/card-kit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchWakatimeStats } from '../src/fetchers/wakatime/index.ts';

import { testConfig } from './_config.ts';
import { FetchMock } from './_fetch-mock.ts';
import { wakaTimeData } from './_wakatime.ts';

const mock = new FetchMock();
const config = testConfig.with({ fetch: mock.fetch });

afterEach(() => {
  mock.reset();
});

describe('WakaTime fetcher', () => {
  it('should fetch correct WakaTime data', async () => {
    const username = 'anuraghazra';
    mock
      .onGet(`https://wakatime.com/api/v1/users/${username}/stats?is_including_today=true`)
      .reply(200, wakaTimeData);

    const repo = await fetchWakatimeStats({ username }, config);
    expect(repo).toStrictEqual(wakaTimeData.data);
  });

  it.each(['last_30_days', 'all_time'] as const)(
    'asks for the %s range as a path segment',
    async (range) => {
      mock
        .onGet(`https://wakatime.com/api/v1/users/user/stats/${range}?is_including_today=true`)
        .reply(200, wakaTimeData);

      await expect(fetchWakatimeStats({ username: 'user', range }, config)).resolves.toStrictEqual(
        wakaTimeData.data,
      );
    },
  );

  it('refuses a range outside the list before any request', async () => {
    await expect(
      // @ts-expect-error a caller past the api boundary, which the type would stop
      fetchWakatimeStats({ username: 'user', range: '../evil' }, config),
    ).rejects.toMatchObject({ reason: 'wakatime_invalid_range' });
    expect(mock.history.get).toHaveLength(0);
  });

  it('should throw error if username param missing', async () => {
    mock.onGet(/wakatime\.com\/api/).reply(404, wakaTimeData);

    // @ts-expect-error testing invalid input
    await expect(fetchWakatimeStats('noone', config)).rejects.toThrow(
      'Missing params "username" make sure you pass the parameters in URL',
    );
  });

  it.each(['wakapi.dev', 'localhost:3000', 'stats.example.com', 'wakapi.dev:65535'])(
    'fetches from the host %j',
    async (wakatime_host) => {
      mock
        .onGet(`https://${wakatime_host}/api/v1/users/user/stats?is_including_today=true`)
        .reply(200, wakaTimeData);

      await expect(
        fetchWakatimeStats(
          { username: 'user', wakatime_host },
          config.with({ wakatimeHosts: [wakatime_host] }),
        ),
      ).resolves.toStrictEqual(wakaTimeData.data);
    },
  );

  it.each(['localhost:3000', '169.254.169.254', 'wakapi.dev'])(
    'refuses the host %j unless the deployment lists it, before any request',
    async (wakatime_host) => {
      await expect(
        fetchWakatimeStats({ username: 'user', wakatime_host }, config),
      ).rejects.toMatchObject({ reason: 'wakatime_invalid_host' });
      expect(mock.history.get).toHaveLength(0);
    },
  );

  it('matches a listed host whatever its case', async () => {
    mock
      .onGet('https://WakaPi.dev/api/v1/users/user/stats?is_including_today=true')
      .reply(200, wakaTimeData);

    await expect(
      fetchWakatimeStats(
        { username: 'user', wakatime_host: 'WakaPi.dev' },
        config.with({ wakatimeHosts: ['wakapi.DEV'] }),
      ),
    ).resolves.toStrictEqual(wakaTimeData.data);
  });

  it('refuses WakaTime itself once the deployment lists only other hosts', async () => {
    await expect(
      fetchWakatimeStats({ username: 'user' }, config.with({ wakatimeHosts: ['wakapi.dev'] })),
    ).rejects.toMatchObject({ reason: 'wakatime_invalid_host' });
    expect(mock.history.get).toHaveLength(0);
  });

  it('follows no redirect, so a listed host cannot send it to a private address', async () => {
    // answers as `fetch` would: following the redirect unless told not to
    const transport = vi.fn<FetchLike>(async (_input, init) => {
      if (init?.redirect === 'manual') {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: { location: 'http://169.254.169.254/latest/meta-data/' },
          }),
        );
      }
      return Promise.resolve(Response.json(wakaTimeData));
    });

    await expect(
      fetchWakatimeStats(
        { username: 'user', wakatime_host: 'wakapi.dev' },
        config.with({ fetch: transport, wakatimeHosts: ['wakapi.dev'] }),
      ),
    ).rejects.toMatchObject({ reason: 'wakatime_unavailable' });
  });

  it("fetches from any host under 'any'", async () => {
    mock
      .onGet('https://localhost:3000/api/v1/users/user/stats?is_including_today=true')
      .reply(200, wakaTimeData);

    await expect(
      fetchWakatimeStats(
        { username: 'user', wakatime_host: 'localhost:3000' },
        config.with({ wakatimeHosts: 'any' }),
      ),
    ).resolves.toStrictEqual(wakaTimeData.data);
  });

  it.each(['evil.com/x?', 'user@evil.com'])('refuses the api domain %j', async (wakatime_host) => {
    await expect(
      fetchWakatimeStats({ username: 'user', wakatime_host }, config),
    ).rejects.toMatchObject({
      reason: 'wakatime_invalid_host',
    });
  });

  it('refuses a username that is not one path segment', async () => {
    await expect(fetchWakatimeStats({ username: '../x' }, config)).rejects.toMatchObject({
      reason: 'invalid_username',
    });
  });

  it('should throw error if username is not found', async () => {
    mock.onGet(/wakatime\.com\/api/).reply(404, wakaTimeData);

    await expect(fetchWakatimeStats({ username: 'noone' }, config)).rejects.toMatchObject({
      reason: 'wakatime_user_not_found',
      message: "Could not resolve to a User with the login of 'noone'",
    });
  });
});
