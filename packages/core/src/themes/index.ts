/**
 * @file The forge's palettes. Each family is drawn twice, once per color scheme, so a card can
 * follow the viewer (`theme=ember`) or pin one variant (`theme=ember_dark`).
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

/** The palettes that come in a light and a dark variant. */
const THEME_FAMILIES = ['ember', 'cobalt', 'verdigris', 'magma', 'brass'] as const;

type ThemeFamily = (typeof THEME_FAMILIES)[number];

/** The family a card wears when no theme is named. */
const DEFAULT_THEME_FAMILY = 'ember' satisfies ThemeFamily;

/**
 * Collection of available themes: two per family, plus `transparent`, whose one variant reads on
 * either README.
 */
const themes = {
  ember_light: { heat: ['dc7600', 'e2470f', 'c8174f'], text_color: '2a1b14', bg_color: 'fffaf6' },
  ember_dark: { heat: ['ffd166', 'ff7a1a', 'ff2e63'], text_color: 'f7ede6', bg_color: '16100d' },
  cobalt_light: { heat: ['0891b2', '2b5cff', '6d3cf0'], text_color: '121833', bg_color: 'f7f9ff' },
  cobalt_dark: { heat: ['7df3ff', '3d8bff', '8a5cff'], text_color: 'eef2ff', bg_color: '0b1020' },
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
  magma_light: { heat: ['dd730b', 'e11d74', '9333ea'], text_color: '2a1026', bg_color: 'fff8fb' },
  magma_dark: { heat: ['ffb86b', 'ff4d8d', 'b14dff'], text_color: 'f8ecf6', bg_color: '130a16' },
  brass_light: { heat: ['a87b12', '8f5f17', '6b4212'], text_color: '22201b', bg_color: 'fbfaf7' },
  brass_dark: { heat: ['f5e6b8', 'd4a44c', 'a8742a'], text_color: 'f2efe8', bg_color: '121110' },
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

/** @returns Whether a value names a family, which resolves to its light and dark variants. */
const isThemeFamily = (value: unknown): value is ThemeFamily =>
  THEME_FAMILIES.some((family) => family === value);

/** Every name the `theme` params accept: each variant, and each family. */
const THEME_PARAM_VALUES: ReadonlyArray<string> = [...THEME_FAMILIES, ...Object.keys(themes)];

export type { Theme, ThemeFamily, ThemeName };
export {
  DEFAULT_THEME_FAMILY,
  THEME_FAMILIES,
  THEME_PARAM_VALUES,
  isThemeFamily,
  isThemeName,
  themes,
};
