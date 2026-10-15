import type { CardConfig } from '../common/config.ts';
import { HOSTNAME_PATTERN, WAKATIME_USERNAME_PATTERN } from '../common/constants.ts';
import { CardError, WAKATIME_USER_NOT_FOUND } from '../common/error.ts';
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

  // `./fetchers` is a public export, so both are checked here as well as at the api boundary.
  if (!WAKATIME_USERNAME_PATTERN.test(username)) {
    throw new CardError('Invalid username provided.', { code: 'invalid_param', param: 'username' });
  }
  if (api_domain && !HOSTNAME_PATTERN.test(api_domain)) {
    throw new CardError('Invalid API domain provided.', {
      code: 'invalid_param',
      param: 'api_domain',
    });
  }

  const domain = api_domain || 'wakatime.com';
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
