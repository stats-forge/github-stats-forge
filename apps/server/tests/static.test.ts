import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { createHandler } from '../src/handler.ts';
import { createStaticHandler } from '../src/static.ts';

import { GIST_ID, optionsAnswering } from './_fake-github.ts';

/** The first bytes of a PNG, which no text encoding round-trips. Decimal, to keep oxfmt and oxlint agreed. */
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 138];

let root: string;
let site: (pathname: string) => Promise<Response | undefined>;

beforeAll(async () => {
  root = join(tmpdir(), `stats-forge-site-${String(process.pid)}`);
  await mkdir(join(root, '_astro'), { recursive: true });
  await mkdir(join(root, 'docs'), { recursive: true });

  await writeFile(join(root, 'index.html'), '<h1>home</h1>');
  await writeFile(join(root, 'docs', 'index.html'), '<h1>docs</h1>');
  await writeFile(join(root, '_astro', 'page.abc123.js'), 'export {};');
  await writeFile(join(root, 'icon.png'), Buffer.from(PNG_SIGNATURE));
  // two files the `stat` guard lets through and `readFile` then refuses
  await mkdir(join(root, 'dir', 'index.html'), { recursive: true });
  await writeFile(join(root, 'unreadable.txt'), 'x');
  await chmod(join(root, 'unreadable.txt'), 0o000);

  site = createStaticHandler(root);
});

describe(createStaticHandler, () => {
  it('serves a directory by its index, as a static host would', async () => {
    const response = await site('/docs/');

    expect(response?.status).toBe(200);
    expect(response?.headers.get('content-type')).toBe('text/html; charset=utf-8');
    await expect(response?.text()).resolves.toBe('<h1>docs</h1>');
  });

  it('serves the root', async () => {
    const response = await site('/');

    await expect(response?.text()).resolves.toBe('<h1>home</h1>');
  });

  it('keeps a content-hashed asset forever and a page briefly', async () => {
    const asset = await site('/_astro/page.abc123.js');
    const page = await site('/');

    expect(asset?.headers.get('cache-control')).toContain('immutable');
    expect(page?.headers.get('cache-control')).toBe('public, max-age=300');
  });

  it('answers with the bytes, not with text that would mangle them', async () => {
    const response = await site('/icon.png');
    const bytes = new Uint8Array((await response?.arrayBuffer()) ?? new ArrayBuffer(0));

    expect(response?.headers.get('content-type')).toBe('image/png');
    expect([...bytes]).toStrictEqual(PNG_SIGNATURE);
  });

  it('reports nothing for a path the site does not have', async () => {
    await expect(site('/nope')).resolves.toBeUndefined();
  });

  // `normalize` collapses these before the guard sees them; what matters is that none reaches out
  it.each(['/../package.json', '/%2e%2e/package.json', '/docs/../../package.json'])(
    'serves nothing for %s, which tries to walk out of the site',
    async (pathname) => {
      await expect(site(pathname)).resolves.toBeUndefined();
    },
  );

  it('reports nothing for a percent-encoding that is not valid UTF-8', async () => {
    await expect(site('/%E0%A4%A')).resolves.toBeUndefined();
  });

  it('reports nothing for a directory named index.html, rather than throwing', async () => {
    await expect(site('/dir/')).resolves.toBeUndefined();
  });

  // root reads anything, so the permission bits prove nothing there
  it.skipIf(process.getuid?.() === 0)('reports nothing for a file it may not read', async () => {
    await expect(site('/unreadable.txt')).resolves.toBeUndefined();
  });

  it('decides the immutable rule on the file found, not on the path asked', async () => {
    const response = await site('/_astro/..%2Findex.html');

    await expect(response?.text()).resolves.toBe('<h1>home</h1>');
    expect(response?.headers.get('cache-control')).toBe('public, max-age=300');
  });
});

/** A site holding a file exactly where a card is served, which must never win. */
const shadowingCard = (pathname: string): Promise<Response | undefined> =>
  Promise.resolve(pathname === '/api/gist' ? new Response('the site won') : undefined);

describe('the site inside the server', () => {
  it('never shadows a card, being claimed last', async () => {
    const { options } = optionsAnswering(new Error('Network Error'));

    const response = await createHandler({ ...options, site: shadowingCard })(
      new Request(`http://localhost/api/gist?id=${GIST_ID}`),
    );

    expect(response.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    await expect(response.text()).resolves.not.toContain('the site won');
  });

  it('answers a page the site does have', async () => {
    const { options } = optionsAnswering(new Error('Network Error'));

    const response = await createHandler({ ...options, site })(
      new Request('http://localhost/docs/'),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('<h1>docs</h1>');
  });

  it('measures a HEAD in bytes, which a PNG has more of than characters', async () => {
    const { options } = optionsAnswering(new Error('Network Error'));

    const response = await createHandler({ ...options, site })(
      new Request('http://localhost/icon.png', { method: 'HEAD' }),
    );

    expect(response.headers.get('content-length')).toBe(String(PNG_SIGNATURE.length));
    await expect(response.text()).resolves.toBe('');
  });

  it('still answers 404 as JSON when the site has no such page', async () => {
    const { options } = optionsAnswering(new Error('Network Error'));

    const response = await createHandler({ ...options, site })(
      new Request('http://localhost/nope'),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: 'not_found' });
  });
});
