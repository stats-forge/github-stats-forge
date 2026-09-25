import { describe, expect, it } from 'vitest';

import { DEFAULT_LANG_COLOR, getLanguageColor } from '../src/common/languageColors.ts';

describe(getLanguageColor, () => {
  it('should resolve a language from the generated table', () => {
    expect(getLanguageColor('JavaScript')).toBe('#f1e05a');
  });

  it('should ignore case, so a spelling the API differs on still resolves', () => {
    const expected = getLanguageColor('JavaScript');

    expect(getLanguageColor('javascript')).toBe(expected);
    expect(getLanguageColor('JAVASCRIPT')).toBe(expected);
    expect(getLanguageColor('jAvAsCrIpT')).toBe(expected);
  });

  it('should fall back to the default gray for an unknown language', () => {
    expect(getLanguageColor('NonExistentLang123')).toBe(DEFAULT_LANG_COLOR);
  });
});
