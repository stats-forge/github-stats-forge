import { describe, expect, it } from "vitest";

import { gist as gistApi } from "../src/api/gist.js";
import { pin as pinApi } from "../src/api/pin.js";
import { stats as statsApi } from "../src/api/stats.js";
import { topLangs as topLangsApi } from "../src/api/top-langs.js";
import { wakatime as wakatimeApi } from "../src/api/wakatime.js";

// Values containing characters outside the safe set /^[-\w/.,]+$/. These must be
// rejected before any network request is made.
const unsafeValues = ["user name", "user@evil.com", "a<b", "a?b", "a:b", "a&b"];

describe("API input validation", () => {
  describe.each([
    ["top-langs", "username", topLangsApi],
    ["wakatime", "username", wakatimeApi],
    ["gist", "id", gistApi],
    ["stats", "username", statsApi],
    ["stats", "repo", statsApi],
    ["stats", "owner", statsApi],
    ["pin", "username", pinApi],
    ["pin", "repo", pinApi],
  ])("%s: %s", (_endpoint, param, api) => {
    it.each(unsafeValues)(`rejects unsafe ${param} %j`, async (value) => {
      const result = await api({ [param]: value });
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
        const result = await statsApi({
          username: "user",
          commits_year: value,
        });
        expect(result.status).toBe("error");
        // the error card html-escapes the quotes around the parameter name
        expect(result.content).toContain(
          "Invalid number input for parameter &#34;commits_year&#34;",
        );
      },
    );
  });
});
