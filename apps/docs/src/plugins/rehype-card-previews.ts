import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { RehypePlugin } from '@astrojs/markdown-remark';

import { BASE, CARDS_DIR, THEMES_DIR } from '../constants.ts';

/**
 * @file One image in the markdown, two in the page.
 *
 * A card is rendered once per site theme and `styles/card-previews.css` shows the copy matching
 * Starlight's `data-theme`, so no document spells the pair out. A card naming its own theme —
 * `/themes/<name>.svg` — stays one image, there being nothing to switch between.
 */

/** A card preview, written as `![alt](/cards/<name>.svg)` — no mode in the name. */
const CARD_SRC = /^\/cards\/(?<name>[\w-]+)\.svg$/;

/** A theme sample, written as `![alt](/themes/<theme>.svg)`. */
const THEME_SRC = /^\/themes\/(?<name>[\w-]+)\.svg$/;

const PUBLIC_DIR = new URL('../../public/', import.meta.url).pathname;

/** Both modes are always emitted, in this order. */
const MODES = ['light', 'dark'] as const;

/**
 * Read off the SVG itself, so a preview never shifts the page as it loads.
 *
 * @throws {Error} When the file a page references was never rendered.
 *
 * @returns The intrinsic size, or nothing when the SVG declares none.
 */
const readSize = (dir: string, name: string): { width: string; height: string } | undefined => {
  const file = join(PUBLIC_DIR, dir, `${name}.svg`);
  let svg: string;
  try {
    svg = readFileSync(file, 'utf8');
  } catch (error) {
    throw new Error(
      `No card preview at ${file}. Render it with \`pnpm --filter ./apps/docs run generate-cards\`.`,
      { cause: error },
    );
  }

  const width = /\bwidth="(?<value>\d+)"/.exec(svg)?.groups?.['value'];
  const height = /\bheight="(?<value>\d+)"/.exec(svg)?.groups?.['value'];
  return width !== undefined && height !== undefined ? { width, height } : undefined;
};

export const rehypeCardPreviews: RehypePlugin = () => (tree) => {
  // Typed off the tree, so the plugin needs no hast types of its own.
  type Node = (typeof tree.children)[number];
  type ElementNode = Extract<Node, { tagName: string }>;

  /** @returns The pair of images, wrapped so CSS can pick one. */
  const toPreview = (image: ElementNode, name: string): ElementNode => ({
    type: 'element',
    tagName: 'span',
    properties: { className: ['card-preview'] },
    children: MODES.map((mode) => {
      const size = readSize(CARDS_DIR, `${name}-${mode}`);
      return {
        ...image,
        properties: {
          ...image.properties,
          src: `${BASE}/${CARDS_DIR}/${name}-${mode}.svg`,
          className: ['card-preview__img', `card-preview__img--${mode}`],
          loading: 'lazy',
          decoding: 'async',
          ...size,
          // Both copies are in the DOM; only one is shown, so only one is described.
          ...(mode === 'light' ? {} : { alt: '', 'aria-hidden': 'true' }),
        },
      };
    }),
  });

  /** @returns The sample, sized and pointed at the built site. */
  const toSample = (image: ElementNode, name: string): ElementNode => ({
    ...image,
    properties: {
      ...image.properties,
      src: `${BASE}/${THEMES_DIR}/${name}.svg`,
      className: ['card-preview__img'],
      loading: 'lazy',
      decoding: 'async',
      ...readSize(THEMES_DIR, name),
    },
  });

  const walk = (children: Array<Node>): void => {
    for (const [index, child] of children.entries()) {
      if (child.type !== 'element') {
        continue;
      }
      if (child.tagName !== 'img') {
        walk(child.children);
        continue;
      }

      const src = String(child.properties.src);
      const card = CARD_SRC.exec(src)?.groups?.['name'];
      if (card !== undefined) {
        children[index] = toPreview(child, card);
        continue;
      }

      const theme = THEME_SRC.exec(src)?.groups?.['name'];
      if (theme !== undefined) {
        children[index] = toSample(child, theme);
      }
    }
  };

  walk(tree.children);
};
