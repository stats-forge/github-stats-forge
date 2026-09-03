import type { CardConfig } from '../common/config.js';
import { CardError, WAKATIME_USER_NOT_FOUND } from '../common/error.js';
import { httpRequest } from '../common/http.js';

import type { WakaTimeData } from './types.js';

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
    api_domain,
  }: {
    username: string | undefined;
    api_domain?: string | undefined;
  },
  config: CardConfig,
): Promise<WakaTimeData> => {
  if (!username) {
    throw CardError.missingParam(['username']);
  }

  const domain = api_domain ? api_domain.replaceAll(/\/$/gi, '') : 'wakatime.com';
  const res = await httpRequest<{ data: WakaTimeData }>(
    config.fetch,
    `https://${domain}/api/v1/users/${username}/stats?is_including_today=true`,
  );

  // Only a 404 says the profile does not exist.
  // Any other failure is WakaTime being unavailable, which a retry can still answer,
  // so it must not be reported as a permanent one a host would cache.
  if (res.status === 404) {
    throw new CardError(`Could not resolve to a User with the login of '${username}'`, {
      code: 'not_found',
      secondaryMessage: WAKATIME_USER_NOT_FOUND,
    });
  }
  if (res.status < 200 || res.status > 299) {
    throw new CardError(`Could not fetch the WakaTime stats of '${username}'`, {
      code: 'upstream',
    });
  }

  return res.data.data;
};

export { fetchWakatimeStats };
