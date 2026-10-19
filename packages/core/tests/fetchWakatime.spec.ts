import { afterEach, describe, expect, it } from 'vitest';

import { fetchWakatimeStats } from '../src/fetchers/wakatime.ts';

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
        fetchWakatimeStats({ username: 'user', wakatime_host }, config),
      ).resolves.toStrictEqual(wakaTimeData.data);
    },
  );

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
