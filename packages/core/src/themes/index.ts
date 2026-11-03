/**
 * @file The forge's palettes. Each is one look, its suffix naming the background it was drawn
 * for; a card wears one, or a `light,dark` pair to follow the viewer.
 */

/** One color scheme of a palette, every color a bare hex. */
interface Theme {
  /**
   * The heat gradient, from its brightest stop to its deepest: the title, the rule under it,
   * the rank ring and the corner glow are drawn in it.
   */
  heat: readonly [string, string, string];
  text_color: string;
  bg_color: string;
  border_color?: string;
}

/** Collection of available themes. `transparent` alone reads on either README. */
const themes = {
  ember_light: {
    heat: ['dc7600', 'e2470f', 'c8174f'],
    text_color: '2a1b14',
    bg_color: 'fffaf6',
  },
  ember_dark: {
    heat: ['ffd166', 'ff7a1a', 'ff2e63'],
    text_color: 'f7ede6',
    bg_color: '16100d',
  },
  cobalt_light: {
    heat: ['0891b2', '2b5cff', '6d3cf0'],
    text_color: '121833',
    bg_color: 'f7f9ff',
  },
  cobalt_dark: {
    heat: ['7df3ff', '3d8bff', '8a5cff'],
    text_color: 'eef2ff',
    bg_color: '0b1020',
  },
  verdigris_light: {
    heat: ['63a00d', '059669', '0e7490'],
    text_color: '10211c',
    bg_color: 'f5fbf8',
  },
  verdigris_dark: {
    heat: ['d9f99d', '34d399', '0ea5a4'],
    text_color: 'e8f5f0',
    bg_color: '0b1513',
  },
  magma_light: {
    heat: ['dd730b', 'e11d74', '9333ea'],
    text_color: '2a1026',
    bg_color: 'fff8fb',
  },
  magma_dark: {
    heat: ['ffb86b', 'ff4d8d', 'b14dff'],
    text_color: 'f8ecf6',
    bg_color: '130a16',
  },
  brass_light: {
    heat: ['a87b12', '8f5f17', '6b4212'],
    text_color: '22201b',
    bg_color: 'fbfaf7',
  },
  brass_dark: {
    heat: ['f5e6b8', 'd4a44c', 'a8742a'],
    text_color: 'f2efe8',
    bg_color: '121110',
  },
  github_light: {
    heat: ['218bff', '0969da', '0550ae'],
    text_color: '1f2328',
    bg_color: 'ffffff',
    border_color: 'd1d9e0',
  },
  github_dark: {
    heat: ['79c0ff', '4493f8', '1f6feb'],
    text_color: 'f0f6fc',
    bg_color: '0d1117',
    border_color: '3d444d',
  },
  github_dark_dimmed: {
    heat: ['96d0ff', '539bf5', '316dca'],
    text_color: 'cdd9e5',
    bg_color: '22272e',
    border_color: '444c56',
  },
  // Text halfway between GitHub's light and dark greys, so it reads on whichever page shows through.
  transparent: {
    heat: ['cc8308', 'f56806', 'e11d48'],
    text_color: '727a85',
    bg_color: 'ffffff00',
    border_color: '8b949e59',
  },
} as const satisfies Record<string, Theme>;

/**
 * Name of one of the {@link themes}.
 */
type ThemeName = keyof typeof themes;

/**
 * Checks whether a value is one of the {@link themes}
 */
const isThemeName = (value: unknown): value is ThemeName => {
  if (typeof value !== 'string') {
    return false;
  }
  return Object.hasOwn(themes, value);
};

/** What a card wears when no theme is named: a pair, so it follows the viewer. */
const DEFAULT_THEME = 'ember_light,ember_dark';

/** Every name the `theme` param accepts. */
const THEME_PARAM_VALUES: ReadonlyArray<string> = Object.keys(themes);

export type { Theme, ThemeName };
export { DEFAULT_THEME, THEME_PARAM_VALUES, isThemeName, themes };
