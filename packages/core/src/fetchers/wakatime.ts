import axios from "axios";

import { CardError, WAKATIME_USER_NOT_FOUND } from "../common/error.js";

import type { WakaTimeData } from "./types.js";

/**
 * WakaTime data fetcher.
 *
 * @param props Fetcher props.
 * @param props.username WakaTime username.
 * @param props.api_domain Optional WakaTime API domain (defaults to `wakatime.com`).
 * @returns WakaTime data response.
 */
const fetchWakatimeStats = async ({
  username,
  api_domain,
}: {
  username: string | undefined;
  api_domain?: string | undefined;
}): Promise<WakaTimeData> => {
  if (!username) {
    throw CardError.missingParam(["username"]);
  }

  try {
    const { data } = await axios.get<{ data: WakaTimeData }>(
      `https://${
        api_domain ? api_domain.replace(/\/$/gi, "") : "wakatime.com"
      }/api/v1/users/${username}/stats?is_including_today=true`,
    );

    return data.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const { status } = err.response;
      // Only a 404 says the profile does not exist.
      // Any other failure is WakaTime being unavailable, which a retry can still answer,
      // so it must not be reported as a permanent one a host would cache.
      if (status === 404) {
        throw new CardError(
          `Could not resolve to a User with the login of '${username}'`,
          { code: "not_found", secondaryMessage: WAKATIME_USER_NOT_FOUND },
        );
      }
      if (status < 200 || status > 299) {
        throw new CardError(
          `Could not fetch the WakaTime stats of '${username}'`,
          { code: "upstream" },
        );
      }
    }
    throw err;
  }
};

export { fetchWakatimeStats };
