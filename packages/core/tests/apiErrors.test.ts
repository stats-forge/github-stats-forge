import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it, vi } from "vitest";

import gistApi from "../src/api/gist.js";
import statsApi from "../src/api/stats.js";

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
