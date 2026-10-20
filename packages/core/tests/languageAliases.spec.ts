import { describe, expect, it } from 'vitest';

import { linguistLanguage } from '../src/common/languageAliases.ts';

describe(linguistLanguage, () => {
  it.each([
    ['Python', 'Python'],
    [' BASH ', 'Shell'],
    ['octave', 'MATLAB'],
    ['python3', 'Python'],
  ])('should resolve %s to %s', (name, language) => {
    expect(linguistLanguage(name)).toBe(language);
  });

  it.each(['SQL', 'json', 'Markdown'])(
    'should answer null for %s, which the bar leaves out',
    (name) => {
      expect(linguistLanguage(name)).toBeNull();
    },
  );

  it.each(['no-such-kernel', 'constructor', '__proto__'])('should not know %s', (name) => {
    expect(linguistLanguage(name)).toBeUndefined();
  });
});
