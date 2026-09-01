import { afterEach, describe, expect, it, vi } from "vitest";

import type { SpinnerStream } from "../src/spinner.js";
import { withSpinner } from "../src/spinner.js";

/**
 * @param isTTY Whether the fake stream animates.
 * @returns The stream, with everything written to it.
 */
const fakeStream = (
  isTTY: boolean,
): SpinnerStream & { written: Array<string> } => {
  const written: Array<string> = [];
  return {
    isTTY,
    written,
    write: (chunk: string) => written.push(chunk),
  };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("withSpinner", () => {
  it("answers with what the work answered", async () => {
    const stream = fakeStream(false);

    await expect(
      withSpinner("Rendering", () => Promise.resolve("the card"), stream),
    ).resolves.toBe("the card");
  });

  it("prints the label once when nothing can animate", async () => {
    const stream = fakeStream(false);

    await withSpinner("Rendering", () => Promise.resolve(1), stream);

    expect(stream.written).toStrictEqual(["Rendering…\n"]);
  });

  it("hides the cursor and gives it back", async () => {
    const stream = fakeStream(true);

    await withSpinner("Rendering", () => Promise.resolve(1), stream);

    expect(stream.written[0]).toContain("[?25l");
    expect(stream.written.at(-1)).toContain("[?25h");
  });

  it("gives the cursor back when the work throws", async () => {
    const stream = fakeStream(true);

    await expect(
      withSpinner("Rendering", () => Promise.reject(new Error("nope")), stream),
    ).rejects.toThrow("nope");

    expect(stream.written.at(-1)).toContain("[?25h");
  });

  it("draws a frame beside the label while it waits", async () => {
    vi.useFakeTimers();
    const stream = fakeStream(true);

    const done = withSpinner(
      "Rendering",
      () => vi.advanceTimersByTimeAsync(200),
      stream,
    );
    await done;

    const frames = stream.written.filter((chunk) =>
      chunk.includes("Rendering"),
    );
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] Rendering$/);
  });

  it("stops the timer, so the process can exit", async () => {
    vi.useFakeTimers();
    const stream = fakeStream(true);

    await withSpinner("Rendering", () => Promise.resolve(1), stream);
    expect(vi.getTimerCount()).toBe(0);
  });
});
