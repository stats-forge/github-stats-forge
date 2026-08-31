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
    if (
      axios.isAxiosError(err) &&
      err.response &&
      (err.response.status < 200 || err.response.status > 299)
    ) {
      throw new CardError(
        `Could not resolve to a User with the login of '${username}'`,
        { code: "not_found", secondaryMessage: WAKATIME_USER_NOT_FOUND },
      );
    }
    throw err;
  }
};

export { fetchWakatimeStats };
