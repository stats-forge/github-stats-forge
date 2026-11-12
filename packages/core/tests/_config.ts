import { afterEach, vi } from 'vitest';

import { CardConfig } from '../src/common/config.ts';
import type { Logger } from '../src/common/log.ts';

/** Takes core's diagnostics, so a spec can assert on them and the run prints none. */
export const testLogger = {
  log: vi.fn<Logger['log']>(),
  error: vi.fn<Logger['error']>(),
} satisfies Logger;

afterEach(() => {
  testLogger.log.mockClear();
  testLogger.error.mockClear();
});

/** Baseline config for tests: the two tokens the suite used to put in `process.env`. */
export const testConfig = new CardConfig({
  pats: [
    { name: 'PAT_1', value: 'dummyPAT1' },
    { name: 'PAT_2', value: 'dummyPAT2' },
  ],
  logger: testLogger,
});
