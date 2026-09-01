import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { gist as gistApi } from "../src/api/gist.js";
import { pin as pinApi } from "../src/api/pin.js";
import { stats as statsApi } from "../src/api/stats.js";
import { topLangs as topLangsApi } from "../src/api/top-langs.js";
import { wakatime as wakatimeApi } from "../src/api/wakatime.js";

import { testConfig } from "./_config.js";
import { FetchMock } from "./_fetch-mock.js";

// Nothing here is about fetching:
// every request fails immediately, so a query that got past validation is a temporary error.
const mock = new FetchMock();
const config = testConfig.with({ fetch: mock.fetch });

/** Every endpoint, called the way its own signature allows. */
const endpoints = {
  stats: (query: Record<string, string>) => statsApi(query, config),
  pin: (query: Record<string, string>) => pinApi(query, config),
  "top-langs": (query: Record<string, string>) => topLangsApi(query, config),
  gist: (query: Record<string, string>) => gistApi(query, config),
  wakatime: (query: Record<string, string>) => wakatimeApi(query, config),
};

const withUser = (endpoint: string): Record<string, string> =>
  endpoint === "gist" ? { id: "abc123" } : { username: "anuraghazra" };

beforeAll(() => {
  mock.onAny().networkError();
});

afterAll(() => {
  mock.reset();
});

describe("api query schemas", () => {
  it.each(Object.entries(endpoints))(
    "%s rejects an unavailable locale with the same wording",
    async (name, call) => {
      const result = await call({ ...withUser(name), locale: "xx" });

      // the gist card has no translated text, so it takes no locale at all
      if (name === "gist") {
        expect(result.content).not.toContain("Locale not found");
        return;
      }
      expect(result.status).toBe("error");
      expect(result.content).toContain("Locale not found");
    },
  );

  it.each(Object.entries(endpoints))(
    "%s ignores params it does not declare",
    async (name, call) => {
      const result = await call({
        ...withUser(name),
        cache_seconds: "86400",
        client: "wizard",
        // a param another endpoint owns
        langs_count: "4",
      });

      // the stubbed fetch fails, so anything that got past validation is temporary
      expect(result.status).toBe("error");
    },
  );

  it.each(Object.entries(endpoints))(
    "%s reports the first invalid color by name",
    async (name, call) => {
      const result = await call({
        ...withUser(name),
        title_color: "not-a-color",
        bg_color: "also-not-a-color",
      });

      expect(result.status).toBe("error");
      expect(result.content).toContain(
        "Invalid color input for parameter &#34;title_color&#34;",
      );
    },
  );

  it("rejects a malformed number by naming the param", async () => {
    const result = await endpoints.stats({
      username: "anuraghazra",
      border_radius: "abc",
    });

    expect(result.status).toBe("error");
    expect(result.content).toContain(
      "Invalid number input for parameter &#34;border_radius&#34;",
    );
  });

  it("keeps the coercion the card performs, so 10px is 10", async () => {
    const result = await endpoints.stats({
      username: "anuraghazra",
      border_radius: "10px",
    });

    // the stubbed fetch fails, but the param got past validation
    expect(result.status).toBe("error");
  });

  it.each([
    ["layout", "sideways", "Incorrect layout input"],
    ["stats_format", "kilobytes", "Incorrect stats_format input"],
  ])("rejects an unrenderable %s", async (param, value, message) => {
    const result = await endpoints["top-langs"]({
      username: "anuraghazra",
      [param]: value,
    });

    expect(result.status).toBe("error");
    expect(result.content).toContain(message);
  });
});
