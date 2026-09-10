/**
 * @file Serves the built site to the e2e run, in the foreground.
 *
 * `astro preview` always daemonizes in Astro 7, so the process Playwright starts exits at once and
 * `webServer` gives up with "exited early". Thirty lines is cheaper than depending on that.
 *
 * **Keep the table and the guard aligned with `apps/server/src/static.ts`.**
 * They are a copy rather than an import because the image carries the site,
 * so the site must not depend on the server; a change to either file belongs in both.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASE } from '../src/constants.ts';

const ROOT = fileURLToPath(new URL('../build', import.meta.url));

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

/**
 * A directory is served by its `index.html`, as a static host would. Throws rather than reporting
 * a miss, so the one caller answers every kind — escaped the build, absent, no index — alike.
 *
 * @returns The absolute path to serve.
 */
const resolveFile = async (pathname: string): Promise<string> => {
  const withoutBase = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  const candidate = resolve(join(ROOT, normalize(decodeURIComponent(withoutBase))));

  if (candidate !== ROOT && !candidate.startsWith(`${ROOT}/`)) {
    throw new Error(`${pathname} escapes the build`);
  }

  const found = await stat(candidate);
  if (!found.isDirectory()) {
    return candidate;
  }

  const index = join(candidate, 'index.html');
  await stat(index);
  return index;
};

const port = Number(process.argv[2] ?? 4329);

const server = createServer((request, response) => {
  void (async (): Promise<void> => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');

    let file: string;
    try {
      file = await resolveFile(pathname);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    });
    createReadStream(file).pipe(response);
  })();
});

server.listen(port, () => {
  process.stdout.write(`Serving build on http://localhost:${String(port)}${BASE}/\n`);
});
