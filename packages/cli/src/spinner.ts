/**
 * @file The wait between the last prompt and the file.
 *
 * Rendering a card means fetching from GitHub, which takes long enough that a
 * still terminal reads as a hung one.
 */

/** Braille frames: one cell wide, so the line never reflows. */
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL_MS = 80;

const HIDE_CURSOR = "\u001b[?25l";
const SHOW_CURSOR = "\u001b[?25h";
/** Return to the start of the line and wipe what was on it. */
const CLEAR_LINE = "\r\u001b[K";

/** What the spinner writes to; `process.stderr`, or a fake in a test. */
export interface SpinnerStream {
  isTTY?: boolean | undefined;
  write: (chunk: string) => unknown;
}

/**
 * Runs `work`, spinning until it settles.
 *
 * Written to stderr, so stdout carries only the result.
 * Without a TTY — a pipe, a CI log — the label is printed once and nothing animates.
 *
 * @param label What the wait is for.
 * @param work The wait itself.
 * @param stream Where the spinner is drawn.
 * @returns Whatever `work` answered with.
 */
export const withSpinner = async <T>(
  label: string,
  work: () => Promise<T>,
  stream: SpinnerStream = process.stderr,
): Promise<T> => {
  if (!stream.isTTY) {
    stream.write(`${label}…\n`);
    return work();
  }

  let frame = 0;
  stream.write(HIDE_CURSOR);
  const tick = setInterval(() => {
    stream.write(
      `${CLEAR_LINE}${FRAMES[frame % FRAMES.length] ?? ""} ${label}`,
    );
    frame += 1;
  }, INTERVAL_MS);

  try {
    return await work();
  } finally {
    clearInterval(tick);
    // The line goes back to the shell as it was found, whichever way this ended.
    stream.write(`${CLEAR_LINE}${SHOW_CURSOR}`);
  }
};
