import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadEnvFile, resolveTokens, tokensFromEnv } from '../src/tokens.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe(tokensFromEnv, () => {
  it('reads the PAT_n names core writes', () => {
    expect(tokensFromEnv({ PAT_1: 'one', PAT_2: 'two', HOME: '/somewhere' })).toStrictEqual([
      { name: 'PAT_1', value: 'one' },
      { name: 'PAT_2', value: 'two' },
    ]);
  });

  it('skips a name that holds nothing', () => {
    expect(tokensFromEnv({ PAT_1: '', PAT_2: 'two' })).toStrictEqual([
      { name: 'PAT_2', value: 'two' },
    ]);
  });

  it('ignores a name that only looks like one', () => {
    expect(tokensFromEnv({ PAT: 'x', PAT_ONE: 'y', MY_PAT_1: 'z' })).toStrictEqual([]);
  });
});

describe(resolveTokens, () => {
  it('prefers the flag over the environment', () => {
    expect(resolveTokens(['from-flag'], { PAT_1: 'from-env' })).toStrictEqual([
      { name: '--pat #1', value: 'from-flag' },
    ]);
  });

  it('falls back to the environment', () => {
    expect(resolveTokens([], { PAT_1: 'from-env' })).toStrictEqual([
      { name: 'PAT_1', value: 'from-env' },
    ]);
  });

  it('answers with nothing when neither has one', () => {
    expect(resolveTokens([], {})).toStrictEqual([]);
  });
});

describe(loadEnvFile, () => {
  it('loads the PAT the file carries', () => {
    const dir = mkdtempSync(join(tmpdir(), 'stats-forge-cli-'));
    const file = join(dir, '.env');
    writeFileSync(file, 'PAT_1=from-file\n');

    expect(loadEnvFile(file, true)).toBe(true);
    expect(process.env['PAT_1']).toBe('from-file');

    delete process.env['PAT_1'];
  });

  it('passes over a default file that is not there', () => {
    expect(loadEnvFile(join(tmpdir(), 'no-such-dir', '.env'), false)).toBe(false);
  });

  it('says so when a named file is not there', () => {
    expect(() => loadEnvFile(join(tmpdir(), 'no-such-dir', '.env'), true)).toThrow(
      /No env file at/,
    );
  });
});
