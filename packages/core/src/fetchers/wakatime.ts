import type { CardConfig } from '../common/config.ts';
import { HOSTNAME_PATTERN, WAKATIME_USERNAME_PATTERN } from '../common/constants.ts';
import { CardError } from '../common/error.ts';
import { httpRequest } from '../common/http.ts';

import type { WakaTimeData } from './types.ts';

/**
 * WakaTime data fetcher.
 *
 * WakaTime needs no GitHub token; the config is here for the transport it carries.
 *
 * @returns WakaTime data response.
 */
const fetchWakatimeStats = async (
  {
    username,
    wakatime_host,
  }: {
    username: string | undefined;
    wakatime_host?: string | undefined;
  },
  config: CardConfig,
): Promise<WakaTimeData> => {
  if (!username) {
    throw CardError.because('missing_param', { params: ['username'] });
  }

  // `./fetchers` is a public export, so both are checked here as well as at the api boundary.
  if (!WAKATIME_USERNAME_PATTERN.test(username)) {
    throw CardError.because('invalid_username');
  }
  if (wakatime_host && !HOSTNAME_PATTERN.test(wakatime_host)) {
    throw CardError.because('invalid_wakatime_host');
  }

  const domain = wakatime_host || 'wakatime.com';
  const res = await httpRequest<{ data: WakaTimeData }>(
    config.fetch,
    `https://${domain}/api/v1/users/${username}/stats?is_including_today=true`,
  );

  // Only a 404 says the profile does not exist.
  // Any other failure is WakaTime being unavailable, which a retry can still answer,
  // so it must not be reported as a permanent one a host would cache.
  if (res.status === 404) {
    throw CardError.because('wakatime_user_not_found', { username });
  }
  if (res.status < 200 || res.status > 299) {
    throw CardError.because('wakatime_unavailable', { username });
  }

  return res.data.data;
};

export { fetchWakatimeStats };
