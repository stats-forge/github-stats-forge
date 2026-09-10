/**
 * Where this package's diagnostics go.
 *
 * Dispatches to `console` at call time rather than import time,
 * so a host or a test that replaces `console.log` is obeyed.
 */
const logger: {
  log: (...args: Array<unknown>) => void;
  error: (...args: Array<unknown>) => void;
} = {
  log: (...args) => {
    console.log(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
};

export { logger };
