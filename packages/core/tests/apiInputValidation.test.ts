import { describe, expect, it } from "vitest";

import type { ApiResult } from "../src/api/api-result.js";
import { gist } from "../src/api/gist.js";
import { pin } from "../src/api/pin.js";
import { stats } from "../src/api/stats.js";
import { topLangs } from "../src/api/top-langs.js";
import { wakatime } from "../src/api/wakatime.js";
import { CardConfig } from "../src/common/config.js";

// Values containing characters outside the safe set /^[-\w/.,]+$/. These must be
// rejected before any network request is made.
const unsafeValues = ["user name", "user@evil.com", "a<b", "a?b", "a:b", "a&b"];

// Never reached: every case is rejected before a token would be used.
const config = new CardConfig({ pats: [{ name: "PAT_1", value: "token" }] });

/*
 * Each row sends the value as one param and nothing else,
 * so the rejection cannot be blamed on another param.
 */
const endpoints: Array<
  [string, string, (value: string) => Promise<ApiResult>]
> = [
  ["top-langs", "username", (username) => topLangs({ username }, config)],
  ["wakatime", "username", (username) => wakatime({ username }, config)],
  ["gist", "id", (id) => gist({ id }, config)],
  ["stats", "username", (username) => stats({ username }, config)],
  ["stats", "repo", (repo) => stats({ repo }, config)],
  ["stats", "owner", (owner) => stats({ owner }, config)],
  ["pin", "username", (username) => pin({ username }, config)],
  ["pin", "repo", (repo) => pin({ repo }, config)],
];

describe("API input validation", () => {
  describe.each(endpoints)("%s: %s", (_endpoint, param, send) => {
    it.each(unsafeValues)(`rejects unsafe ${param} %j`, async (value) => {
      const result = await send(value);
      expect(result.status).toBe("error");
      expect(result.content).toContain("unsafe characters");
    });
  });

  describe("stats: commits_year", () => {
    // "" and "12" used to parse to NaN and be silently ignored; "1" reached
    // GitHub as an unparsable DateTime and surfaced as a temporary error.
    it.each(["", "abc", "1", "12", "20244", "2024.5", "-2024"])(
      "rejects %j",
      async (value) => {
        const result = await stats(
          {
            username: "user",
            commits_year: value,
          },
          config,
        );
        expect(result.status).toBe("error");
        // the error card html-escapes the quotes around the parameter name
        expect(result.content).toContain(
          "Invalid number input for parameter &#34;commits_year&#34;",
        );
      },
    );
  });
});
