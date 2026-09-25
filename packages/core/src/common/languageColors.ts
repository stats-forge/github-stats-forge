import languageColorsJson from './languageColors.json' with { type: 'json' };

/** Shown for languages missing from the generated table, and for a null API color. */
const DEFAULT_LANG_COLOR = '#858585';

// Keyed lower-case: the wakatime and gist APIs do not always spell a language as linguist does.
const languageColors = new Map<string, string>(
  Object.entries(languageColorsJson).map(([name, color]) => [name.toLowerCase(), color]),
);

/**
 * Resolves a language's brand color from the generated table, ignoring case.
 *
 * @returns The language's hex color, or the default gray when it is unknown.
 */
const getLanguageColor = (name: string): string =>
  languageColors.get(name.toLowerCase()) ?? DEFAULT_LANG_COLOR;

export { DEFAULT_LANG_COLOR, getLanguageColor };
