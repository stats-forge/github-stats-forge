import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it, vi } from "vitest";

import { gist as gistApi } from "../src/api/gist.js";
import { pin as pinApi } from "../src/api/pin.js";
import { stats as statsApi } from "../src/api/stats.js";
import { wakatime as wakatimeApi } from "../src/api/wakatime.js";

import { testConfig } from "./_config.js";

vi.mock(import("../src/common/log.js"), async () => {
  const { createLoggerMock } = await import("./utils.js");
  return createLoggerMock();
});

const mock = new MockAdapter(axios);

afterEach(() => {
  mock.reset();
});

describe("api errors", () => {
  it("names the param a malformed value came from", async () => {
    const result = await statsApi(
      { username: "anuraghazra", border_radius: "abc" },
      testConfig,
    );

    expect(result).toMatchObject({
      status: "error",
      retryable: false,
      error: { code: "invalid_param", param: "border_radius" },
    });
  });

  it("reports a param the endpoint cannot render without", async () => {
    const result = await gistApi({}, testConfig);

    expect(result).toMatchObject({
      status: "error",
      retryable: false,
      error: { code: "missing_param", param: "id" },
    });
  });

  it("marks an upstream failure retryable", async () => {
    mock.onPost("https://api.github.com/graphql").networkError();

    const result = await statsApi({ username: "anuraghazra" }, testConfig);

    expect(result).toMatchObject({
      status: "error",
      retryable: true,
      error: { code: "upstream" },
    });
  });

  it("does not mark a missing user retryable", async () => {
    mock.onPost("https://api.github.com/graphql").reply(200, {
      errors: [{ type: "NOT_FOUND", message: "Could not resolve to a User." }],
    });

    const result = await statsApi({ username: "not-a-user" }, testConfig);

    expect(result).toMatchObject({
      status: "error",
      retryable: false,
      error: { code: "not_found" },
    });
  });

  it("does not mark a repository that does not exist retryable", async () => {
    mock
      .onPost("https://api.github.com/graphql")
      .reply(200, { data: { user: { repository: null }, organization: null } });

    const result = await pinApi(
      { username: "anuraghazra", repo: "not-a-repo" },
      testConfig,
    );

    expect(result).toMatchObject({
      status: "error",
      retryable: false,
      error: { code: "not_found" },
    });
  });

  it("does not mark a gist that does not exist retryable", async () => {
    mock
      .onPost("https://api.github.com/graphql")
      .reply(200, { data: { viewer: { gist: null } } });

    const result = await gistApi({ id: "not-a-gist" }, testConfig);

    expect(result).toMatchObject({
      status: "error",
      retryable: false,
      error: { code: "not_found" },
    });
  });

  it("does not mark a missing WakaTime profile retryable", async () => {
    mock.onGet(/wakatime\.com/).reply(404);

    const result = await wakatimeApi({ username: "not-a-user" });

    expect(result).toMatchObject({
      status: "error",
      retryable: false,
      error: { code: "not_found" },
    });
  });

  it("marks a WakaTime outage retryable rather than a missing profile", async () => {
    mock.onGet(/wakatime\.com/).reply(500);

    const result = await wakatimeApi({ username: "anuraghazra" });

    expect(result).toMatchObject({
      status: "error",
      retryable: true,
      error: { code: "upstream" },
    });
  });

  it("draws the same failure onto the card", async () => {
    const result = await statsApi(
      { username: "anuraghazra", commits_year: "12" },
      testConfig,
    );

    expect(result.status).toBe("error");
    expect(result.status === "error" && result.error.message).toBe(
      "Something went wrong",
    );
    // the error card html-escapes the quotes around the parameter name
    expect(result.content).toContain(
      "Invalid number input for parameter &#34;commits_year&#34;",
    );
  });
});
