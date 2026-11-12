/**
 * @file Where this package's diagnostics go: a host hands a `Logger` to `CardConfig`.
 */

/** Receives core's diagnostics, each as `console.log` or `console.error` would. */
interface Logger {
  log: (...args: Array<unknown>) => void;
  error: (...args: Array<unknown>) => void;
}

/** Dispatches to `console` at call time, so a host or test that replaces `console.log` is obeyed. */
const consoleLogger: Logger = {
  log: (...args) => {
    console.log(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
};

export { consoleLogger };
export type { Logger };
