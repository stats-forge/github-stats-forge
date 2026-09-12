/**
 * @file `<!-- demo: cli -->` becomes the recording of a CLI session.
 *
 * A plugin rather than raw HTML in the page, because the src has to carry `BASE` and a
 * deployment detail stays out of the prose — the same reason `remark-resolve-links` exists.
 *
 * **`.mp4` has to be in both static tables**, `apps/server/src/static.ts` and `e2e/serve.ts`:
 * they answer an unknown extension `application/octet-stream`, and `x-content-type-options:
 * nosniff` then makes the browser refuse the file rather than merely mislabel it.
 */

import type { RemarkPlugin } from '@astrojs/markdown-remark';

import { BASE } from '../constants.ts';

/** The marker a page leaves where the recording goes. */
const MARKER = /^<!--\s*demo:\s*cli\s*-->$/;

/** Written down because the file is opaque here; keeps the box from resizing as it loads. */
const WIDTH = 2692;
const HEIGHT = 1716;

const VIDEO = 'cli-demo.mp4';
const POSTER = 'cli-demo-poster.jpg';

/** What a screen reader is given in place of the recording. */
const LABEL =
  'A screen recording of the CLI. The stats card is open above the terminal, the menu picks a theme, and the card is redrawn in it when the card is generated.';

/**
 * Not autoplayed: it runs 44 seconds, and an autoplay attribute cannot be withdrawn for
 * `prefers-reduced-motion` without shipping JavaScript to a page that has none.
 *
 * @returns The recording, as one block of HTML.
 */
const render = (): string =>
  [
    '<figure class="cli-demo">',
    `<video class="cli-demo__video" controls playsinline preload="metadata"`,
    ` width="${String(WIDTH)}" height="${String(HEIGHT)}"`,
    ` poster="${BASE}/${POSTER}" aria-label="${LABEL}">`,
    `<source src="${BASE}/${VIDEO}" type="video/mp4" />`,
    '</video>',
    '<figcaption class="cli-demo__caption">Picking the stats card, setting its theme, and generating it — the card above the terminal is redrawn from the file the CLI writes.</figcaption>',
    '</figure>',
  ].join('');

export const remarkCliDemo: RemarkPlugin = () => (tree) => {
  for (const child of tree.children) {
    if (child.type === 'html' && MARKER.test(child.value.trim())) {
      child.value = render();
    }
  }
};
