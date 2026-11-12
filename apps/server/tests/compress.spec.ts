import { brotliDecompressSync, gunzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { MIN_BYTES, compress, negotiate } from '../src/compress.ts';

const LARGE_SVG = `<svg>${'<text>stats</text>'.repeat(200)}</svg>`;

/** @returns A request accepting `acceptEncoding`. */
const asking = (acceptEncoding: string): Request =>
  new Request('http://localhost/api/stats', { headers: { 'accept-encoding': acceptEncoding } });

/** @returns A response carrying `body` as `type`. */
const answer = (body: string, type = 'image/svg+xml; charset=utf-8'): Response =>
  new Response(body, { headers: { 'content-type': type } });

describe(negotiate, () => {
  it.each([
    { header: 'gzip, deflate, br', chosen: 'br' },
    { header: 'gzip', chosen: 'gzip' },
    { header: 'br;q=0, gzip;q=0.5', chosen: 'gzip' },
    { header: 'BR', chosen: 'br' },
    { header: 'gzip;q=0.0, identity', chosen: undefined },
    { header: 'deflate', chosen: undefined },
    { header: '', chosen: undefined },
  ])('answers $chosen to "$header"', ({ header, chosen }) => {
    expect(negotiate(header)).toBe(chosen);
  });
});

describe(compress, () => {
  it('sends brotli to a caller who accepts it, and the same bytes back out', async () => {
    const response = await compress(asking('gzip, br'), answer(LARGE_SVG));
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.headers.get('content-encoding')).toBe('br');
    expect(bytes.byteLength).toBeLessThan(LARGE_SVG.length / 5);
    expect(brotliDecompressSync(bytes).toString()).toBe(LARGE_SVG);
  });

  it('sends gzip to a caller who accepts only that', async () => {
    const response = await compress(asking('gzip'), answer(LARGE_SVG));

    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(gunzipSync(new Uint8Array(await response.arrayBuffer())).toString()).toBe(LARGE_SVG);
  });

  it('says it varies by Accept-Encoding even when it sent the body as it was', async () => {
    const response = await compress(asking(''), answer(LARGE_SVG));

    expect(response.headers.get('content-encoding')).toBeNull();
    expect(response.headers.get('vary')).toBe('Accept-Encoding');
    await expect(response.text()).resolves.toBe(LARGE_SVG);
  });

  it('leaves a body too small to gain anything', async () => {
    const small = 'a'.repeat(MIN_BYTES - 1);
    const response = await compress(asking('br'), answer(small));

    expect(response.headers.get('content-encoding')).toBeNull();
    await expect(response.text()).resolves.toBe(small);
  });

  it('leaves what is already compressed, such as an image or a font', async () => {
    const original = answer('x'.repeat(4096), 'font/woff2');
    const response = await compress(asking('br'), original);

    expect(response).toBe(original);
  });

  it('leaves a body that has none, such as a 304', async () => {
    const original = new Response(null, {
      status: 304,
      headers: { 'content-type': 'image/svg+xml' },
    });

    await expect(compress(asking('br'), original)).resolves.toBe(original);
  });
});
