/** Path the site is served under; GitHub Pages puts it below the repository name. */
export const BASE = '/github-stats-forge';

/** Where a card preview's two SVGs live, relative to `public/`. */
export const CARDS_DIR = 'cards';

/** The theme each preview is rendered with, one per mode Starlight can be in. */
export const CARD_THEMES = { light: 'default', dark: 'dark' } as const;

/** A preview mode, and so the suffix its file carries. */
export type CardMode = keyof typeof CARD_THEMES;

/** Where a theme sample lives, relative to `public/`; one file, since it names its own theme. */
export const THEMES_DIR = 'themes';

/**
 * The themes the reference page draws rather than tabulates.
 * Read by the card generator and by the page generator, so the two cannot disagree.
 */
export const SAMPLE_THEMES = [
  'default',
  'dark',
  'tokyonight',
  'radical',
  'gruvbox',
  'catppuccin_latte',
  // Its background is `ffffff00`, so the sample doubles as the one on the light-and-dark page.
  'transparent',
] as const;

/** The card every theme sample draws, by the name of its file in `cards/`. */
export const SAMPLE_CARD = 'stats';
