/**
 * @file The catalog against a core that reads less than it asks for.
 * Its own file, since the mock replaces core for every import in it.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock(import('@stats-forge/github-stats-forge-core/api'));
  vi.resetModules();
});

describe('the catalog', () => {
  it('refuses to load when it asks for a param core never reads', async () => {
    vi.doMock(import('@stats-forge/github-stats-forge-core/api'), async (importOriginal) => {
      const core = await importOriginal();
      return {
        ...core,
        gist: Object.assign(async (...args: Parameters<typeof core.gist>) => core.gist(...args), {
          ...core.gist,
          PARAMS: {},
        }),
      };
    });

    await expect(import('../src/index.ts')).rejects.toThrow(
      'The gist card asks for "id", which core never reads',
    );
  });
});
