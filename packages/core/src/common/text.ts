/** Advance of each ASCII code point, as a fraction of the font size. */
// prettier-ignore
const CHAR_WIDTHS = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0.2733333110809326, 0.28499999046325686,
  0.39166667461395266, 0.5900000095367431, 0.5383333206176758,
  0.8183333396911621, 0.8, 0.22999999523162842, 0.30166666507720946,
  0.30166666507720946, 0.41666665077209475, 0.6833333492279052,
  0.21666667461395264, 0.4, 0.21666667461395264, 0.3900000095367432,
  0.5383333206176758, 0.5383333206176758, 0.5383333206176758,
  0.5383333206176758, 0.5383333206176758, 0.5383333206176758,
  0.5383333206176758, 0.5383333206176758, 0.5383333206176758,
  0.5383333206176758, 0.21666667461395264, 0.21666667461395264,
  0.6833333492279052, 0.6833333492279052, 0.6833333492279052,
  0.4483333110809326, 0.9550000190734863, 0.6449999809265137,
  0.5733333110809327, 0.6183333396911621, 0.7016666889190674,
  0.5066666603088379, 0.48833332061767576, 0.6866666793823242,
  0.7099999904632568, 0.26666667461395266, 0.35666666030883787,
  0.5800000190734863, 0.4699999809265137, 0.8983333587646485,
  0.7483333110809326, 0.753333330154419, 0.5599999904632569,
  0.753333330154419, 0.5983333110809326, 0.5316666603088379,
  0.5233333110809326, 0.6866666793823242, 0.621666669845581,
  0.9333333015441895, 0.5900000095367431, 0.553333330154419,
  0.5699999809265137, 0.30166666507720946, 0.37833333015441895,
  0.30166666507720946, 0.6833333492279052, 0.41500000953674315,
  0.26833333969116213, 0.5083333492279053, 0.5883333206176757,
  0.4616666793823242, 0.5883333206176757, 0.5233333110809326,
  0.3133333444595337, 0.5883333206176757, 0.5666666507720948,
  0.24166667461395264, 0.24166667461395264, 0.49666666984558105,
  0.24166667461395264, 0.8616666793823242, 0.5666666507720948,
  0.5866666793823242, 0.5883333206176757, 0.5883333206176757,
  0.3483333349227905, 0.425, 0.33833334445953367, 0.5666666507720948,
  0.4783333301544189, 0.7233333110809326, 0.45833334922790525,
  0.4833333492279053, 0.45166668891906736, 0.30166666507720946,
  0.24000000953674316, 0.30166666507720946, 0.6833333492279052,
];

/** Advance of a code point the table does not cover. */
const AVERAGE_CHAR_WIDTH = 0.5131403493881227;
/**
 * Full-width glyphs: U+3000–U+9FFF (CJK symbols and punctuation, Hiragana, Katakana,
 * CJK Unified Ideographs incl. Extension A) plus U+FF00–U+FFEF (halfwidth and fullwidth forms).
 */
const FULL_WIDTH_PATTERN = /[\u3000-\u9FFF\uFF00-\uFFEF]/;

/**
 * Retrieve text length based on Segoe UI font.
 *
 * @see https://stackoverflow.com/a/48172630/10629172
 *
 * @returns Text length.
 */
const measureText = (str: string, fontSize = 10): number =>
  [...str]
    .map((char) => {
      if (FULL_WIDTH_PATTERN.test(char)) {
        return 1;
      }
      return CHAR_WIDTHS[char.codePointAt(0) ?? 0] ?? AVERAGE_CHAR_WIDTH;
    })
    .reduce((total, width) => total + width, 0) * fontSize;

/**
 * Split text into the lines it would wrap to when laid out greedily at the
 * given font size inside a box of width `maxWidth`. Uses `measureText` so the
 * estimate reflects actual font metrics rather than a fixed character count.
 *
 * @returns Estimated wrapped lines.
 */
const splitWrappedText = (text: string, fontSize: number, maxWidth: number): Array<string> => {
  if (!text) {
    return [];
  }

  // Tokenize the text into atoms representing line-break opportunities:
  //   - ASCII whitespace runs (collapsed/dropped at line edges per CSS rules);
  //   - non-ASCII whitespaces
  //   - a single CJK codepoint (browsers break between any two CJK chars,
  //     punctuation or not, so each one is its own atom and ~1 em wide);
  //   - a run of non-whitespace non-CJK characters (a "word" that can only
  //     break at its boundaries, like Latin script).
  // Korean Hangul (U+AC00–U+D7AF) is intentionally NOT in the CJK range
  // because Korean wraps at word boundaries by default in HTML.
  // ASCII whitespace is collapsed to a single space per CSS `white-space: normal;`
  const normalizedText = text.replaceAll(/[\t\n\r ]+/g, ' ');
  const tokens = normalizedText.match(
    /\s|[\u3000-\u9FFF\uFF00-\uFFEF]|[^\s\u3000-\u9FFF\uFF00-\uFFEF]+/g,
  );
  if (!tokens) {
    return [];
  }

  const takeFittingSegment = (
    token: string,
    availableWidth: number,
  ): { segment: string; width: number } => {
    const characters = [...token];
    let segment = '';
    let width = 0;

    for (const character of characters) {
      const characterWidth = measureText(character, fontSize);
      if (segment && width + characterWidth > availableWidth) {
        break;
      }
      segment += character;
      width += characterWidth;
    }

    return {
      segment,
      width,
    };
  };

  const lines = [''];
  let currentWidth = 0;

  for (const token of tokens) {
    if (token === ' ') {
      // Whitespace at the start of a line is dropped by browsers.
      if (currentWidth === 0) {
        continue;
      }
      lines[lines.length - 1] = (lines.at(-1) ?? '') + token;
      currentWidth += measureText(token, fontSize);
      continue;
    }

    let remaining = token;

    while (remaining) {
      const w = measureText(remaining, fontSize);
      if (currentWidth + w <= maxWidth) {
        lines[lines.length - 1] = (lines.at(-1) ?? '') + remaining;
        currentWidth += w;
        break;
      }

      if (currentWidth > 0) {
        lines.push('');
        currentWidth = 0;
        continue;
      }

      // An atom wider than the box wraps mid-glyph (overflow-wrap: anywhere).
      const { segment, width } = takeFittingSegment(remaining, maxWidth);
      lines[lines.length - 1] = (lines.at(-1) ?? '') + segment;
      currentWidth = width;
      remaining = remaining.slice(segment.length);
    }
  }

  return lines.map((line) => line.replace(/[\t\n\r ]+$/, ''));
};

/**
 * Split text over multiple lines based on the card width.
 *
 * @returns Array of lines.
 */
const wrapTextMultiline = (
  text: string,
  width: number,
  fontSize: number,
  maxLines = 3,
): Array<string> => {
  const wrapped = splitWrappedText(text, fontSize, width);
  const lines = wrapped.map((line) => line.trim()).slice(0, maxLines); // Only consider maxLines lines

  // Add "..." to the last line if the text exceeds maxLines
  if (wrapped.length > maxLines) {
    const lastIndex = maxLines - 1;
    const lastLine = lines[lastIndex];
    if (lastLine !== undefined) {
      lines[lastIndex] = `${lastLine}...`;
    }
  }

  // Remove empty lines if text fits in less than maxLines lines
  const multiLineText = lines.filter(Boolean);
  return multiLineText;
};

export { measureText, splitWrappedText, wrapTextMultiline };
