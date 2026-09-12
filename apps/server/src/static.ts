/**
 * @file The built documentation site, served from the image.
 *
 * **Keep the table and the guard aligned with `apps/docs/e2e/serve.ts`.**
 * That file is a copy rather than an import because the image carries the site,
 * so the site must not depend on the server; a change to either file belongs in both.
 * `/_astro/**` is content-hashed, so immutable; everything else keeps briefly.
 */

import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, relative, resolve } from 'node:path';

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

const IMMUTABLE_DIR = '_astro/';
const IMMUTABLE = 'public, max-age=31536000, immutable';

/** Everything else is named by its route, so a rebuilt site has to be noticed. */
const SHORT = 'public, max-age=300';

/**
 * The file a path names, a directory being served by its `index.html`.
 *
 * @returns The absolute path to read, or `undefined` when the site has no such file.
 */
const resolveFile = async (root: string, pathname: string): Promise<string | undefined> => {
  let candidate: string;
  try {
    candidate = resolve(join(root, normalize(decodeURIComponent(pathname))));
  } catch {
    // a percent-encoding that is not valid UTF-8 names no file
    return undefined;
  }

  // `normalize` collapses `..`, but only this proves the result stayed inside the site
  if (candidate !== root && !candidate.startsWith(`${root}/`)) {
    return undefined;
  }

  try {
    const found = await stat(candidate);
    if (!found.isDirectory()) {
      return candidate;
    }
    const index = join(candidate, 'index.html');
    await stat(index);
    return index;
  } catch {
    return undefined;
  }
};

/**
 * A handler over the built site, claimed after `/api` and `/healthz` so a card always wins.
 *
 * @returns The file's response, or `undefined` when the site does not serve that path.
 */
const createStaticHandler = (root: string) => {
  const site = resolve(root);

  return async (pathname: string): Promise<Response | undefined> => {
    const file = await resolveFile(site, pathname);
    if (file === undefined) {
      return undefined;
    }

    try {
      return new Response(await readFile(file), {
        headers: {
          'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
          // decided on the file found, not the path asked: `/_astro/..%2Fpage` is not an asset
          'cache-control': relative(site, file).startsWith(IMMUTABLE_DIR) ? IMMUTABLE : SHORT,
          'x-content-type-options': 'nosniff',
        },
      });
    } catch {
      // a directory named `index.html`, or a file the process may not read: not served, not fatal
      return undefined;
    }
  };
};

export { createStaticHandler };
