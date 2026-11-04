/** Where the canonical documentation is: GitHub Pages, below the repository name. */
export const PAGES_SITE = 'https://stats-forge.github.io';
export const PAGES_BASE = '/github-stats-forge';

/**
 * Path the site is served under, without a trailing slash and empty at the root. GitHub Pages
 * puts it below the repository name; the container image serves it at `/`.
 *
 * **Node only**: the one script that runs in a browser reads Astro's `import.meta.env.BASE_URL`.
 */
export const BASE = (process.env['SITE_BASE'] ?? PAGES_BASE).replace(/\/+$/, '');

/**
 * Whether this build will be served by the card server, which is what lets the anvil draw from it.
 * Told rather than probed, since on Pages there is no server to find. **Node only**, as `BASE` is;
 * `anvil.astro` writes it into the page.
 */
export const SERVED_BY_INSTANCE = process.env['SITE_SERVER'] === 'true';

/**
 * The pages excluded when self-hosted, by route: how to call the library and run the CLI,
 * which nobody reaches through a deployment. A link to one is left as its text, since an instance
 * documents only the version it runs.
 */
const EXCLUDED_WHEN_SELF_HOSTED = ['docs/fetchers', 'docs/usage/library', 'docs/usage/cli'];

/** @returns Whether this build is self-hosted and excludes the page at `slug`, a route without its slashes. */
export const isExcludedWhenSelfHosted = (slug: string): boolean =>
  SERVED_BY_INSTANCE &&
  EXCLUDED_WHEN_SELF_HOSTED.some((route) => slug === route || slug.startsWith(`${route}/`));

/** What the header chip and the tab call an instance. */
export const SELF_HOSTED = 'Self-hosted';

/** The rest of it, which the chip gives up on hover. */
export const SELF_HOSTED_DETAIL =
  'Served by a self-hosted instance, from its own GitHub tokens. The documentation is the copy built into the image, so it describes the version that is running.';

/** Where a card preview's two SVGs live, relative to `public/`. */
export const CARDS_DIR = 'cards';

/** The theme each preview is rendered with, one per mode Starlight can be in. */
export const CARD_THEMES = { light: 'ember_light', dark: 'ember_dark' } as const;

/** A preview mode, and so the suffix its file carries. */
export type CardMode = keyof typeof CARD_THEMES;

/** Where a theme sample lives, relative to `public/`; one file, since it names its own theme. */
export const THEMES_DIR = 'themes';

/**
 * Drawn rather than tabulated, each file name to the `theme` it is drawn in. Read by both
 * generators, so the two cannot disagree.
 */
export const SAMPLE_THEMES = {
  ember: 'ember_light,ember_dark',
  cobalt: 'cobalt_light,cobalt_dark',
  verdigris: 'verdigris_light,verdigris_dark',
  magma: 'magma_light,magma_dark',
  brass: 'brass_light,brass_dark',
  github: 'github_light,github_dark',
  quiet: 'classic,nord',
  // Its background is `ffffff00`, so the sample doubles as the one on the light-and-dark page.
  transparent: 'transparent',
} as const;

/** The card every theme sample draws, by the name of its file in `cards/`. */
export const SAMPLE_CARD = 'stats';
