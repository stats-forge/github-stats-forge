import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ApiResult } from '@stats-forge/github-stats-forge-core/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_FILE, loadCache, saveCache } from '../src/cache-file.ts';
import { CardCache } from '../src/cache.ts';

const success: ApiResult = { status: 'success', content: '<svg />' };

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'card-cache-'));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe('the card cache on disk', () => {
  it('brings back what the last process held', async () => {
    const before = new CardCache(10, 60);
    before.set('/api/gist?id=1', success, 600);

    await expect(saveCache(before, dir)).resolves.toBe(1);
    const after = new CardCache(10, 60);
    await expect(loadCache(after, dir)).resolves.toBe(1);

    expect(after.get('/api/gist?id=1')?.result).toStrictEqual(success);
  });

  it('creates the directory it was pointed at', async () => {
    const nested = join(dir, 'a', 'b');
    const cache = new CardCache(10, 60);
    cache.set('k', success, 600);

    await saveCache(cache, nested);

    await expect(readFile(join(nested, CACHE_FILE), 'utf8')).resolves.toContain('"version":1');
  });

  it('starts empty and quietly when there is no file yet', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    await expect(loadCache(new CardCache(10, 60), dir)).resolves.toBe(0);
    expect(stderr).not.toHaveBeenCalled();
  });

  it.each([
    { what: 'not JSON', text: '{' },
    { what: 'another version', text: '{"version":0,"cards":[{"key":"k"}]}' },
    { what: 'a card missing its body', text: '{"version":1,"cards":[{"key":"k","storedAt":1}]}' },
  ])('ignores a file that is $what', async ({ text }) => {
    await writeFile(join(dir, CACHE_FILE), text);

    await expect(loadCache(new CardCache(10, 60), dir)).resolves.toBe(0);
  });

  it('reports a cache it cannot write, without throwing, so a shutdown still finishes', async () => {
    // the failure is the subject; its message would only be noise in the run
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    await writeFile(join(dir, 'file'), '');

    await expect(saveCache(new CardCache(10, 60), join(dir, 'file'))).resolves.toBe(0);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Could not write'));
  });

  it('reports a cache it cannot read', async () => {
    // a directory where the file should be
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    await saveCache(new CardCache(10, 60), join(dir, CACHE_FILE));

    await expect(loadCache(new CardCache(10, 60), dir)).resolves.toBe(0);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Could not read'));
  });
});
