import { describe, expect, it } from 'vitest';

import { encodeHTML } from '../src/markup/html.js';

describe('Test html.js', () => {
  it('should encode HTML entities', () => {
    expect(encodeHTML(`<html>"'\`\\hello world<,.#4^&^@%!🛜©))`)).toBe(
      '&#60;html&#62;&#34;&#39;`\\hello world&#60;,.#4^&#38;^@%!🛜&#169;))',
    );
  });

  it('should handle empty strings', () => {
    expect(encodeHTML('')).toBe('');
  });

  it('should leave plain ASCII untouched', () => {
    const path = 'M8 .25a.75.75 0 01.673.418l1.882 3.815z';
    expect(encodeHTML(path)).toBe(path);
  });

  it('should encode text that already looks like a character reference', () => {
    // Nothing pre-escapes any more, so `&#38;` is literal text and encodes like any `&`.
    expect(encodeHTML('a &#38; b')).toBe('a &#38;#38; b');
  });

  it('should drop backspace', () => {
    expect(encodeHTML('a\u0008b')).toBe('ab');
  });
});
