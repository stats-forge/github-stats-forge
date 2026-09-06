import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { RemarkPlugin } from '@astrojs/markdown-remark';

import { BASE } from '../constants.ts';

/**
 * @file Turns a page's relative links into the URLs they mean.
 *
 * A page links to its neighbours the way it reads — `../cards/stats/` — because the base the site
 * is served under is a deployment detail and does not belong in the prose. The browser needs it
 * though, and so does `starlight-links-validator`, which cannot resolve a relative link at all: it
 * skips one, which quietly exempted every internal link from validation until 2026-09-06.
 *
 * Running here rather than in rehype is deliberate. Starlight appends its own plugins after the
 * ones configured on the processor, so the validator collects links after this has rewritten them.
 */

const CONTENT_DIR = fileURLToPath(new URL('../content/docs/', import.meta.url));

/** A link this rewrites: not external, not a bare anchor, not already absolute. */
const isRelative = (url: string): boolean =>
  !/^[a-z][\w+.-]*:/i.test(url) && !url.startsWith('#') && !url.startsWith('/');

/**
 * The URL a page is served at, with a trailing slash, so a relative link resolves against it the
 * way a browser would.
 *
 * @returns The route, or nothing when the file is not a docs page.
 */
const routeOf = (path: string | undefined): string | undefined => {
  if (path === undefined || !path.startsWith(CONTENT_DIR)) {
    return undefined;
  }
  // An `index` page is served at its directory, at any depth.
  const slug = relative(CONTENT_DIR, path)
    .replace(/\.mdx?$/, '')
    .replace(/(?:^|\/)index$/, '');
  return slug === '' ? `${BASE}/` : `${BASE}/${slug}/`;
};

export const remarkResolveLinks: RemarkPlugin = () => (tree, file) => {
  const from = routeOf(file.path);
  if (from === undefined) {
    return;
  }

  // `URL` resolves `../` and `./` exactly as a browser does; the origin is thrown away.
  const base = new URL(from, 'https://links.invalid');

  type Node = (typeof tree.children)[number];

  const walk = (children: Array<Node>): void => {
    for (const child of children) {
      if (child.type === 'link' && isRelative(child.url)) {
        const resolved = new URL(child.url, base);
        child.url = `${resolved.pathname}${resolved.search}${resolved.hash}`;
      }

      if ('children' in child) {
        walk(child.children);
      }
    }
  };

  walk(tree.children);
};
