/**
 * What has to be encoded: the markup characters, everything above plain ASCII, and a backspace.
 * One source for both regexes, so the check and the replacement cannot disagree.
 */
const ENCODED = '[<>&"\'\\u00A0-\\u9999\\u0008]';

/** Non-global, so `.test` stays stateless: a global regex would carry `lastIndex`. */
const NEEDS_ENCODING = new RegExp(ENCODED);
const TO_ENCODE = new RegExp(ENCODED, 'g');

const BACKSPACE = '\u0008';

/**
 * Encodes a string for use as markup, one numeric character reference each.
 *
 * The serializer is now the only place text becomes markup, so nothing arrives pre-escaped:
 * a literal `&#38;` is encoded like any other `&` rather than passed through as a reference.
 *
 * @param str The text to encode.
 * @returns The text, safe to place in an attribute or as character data.
 * @see https://stackoverflow.com/a/48073476/10629172
 */
const encodeHTML = (str: string): string => {
  // Most strings a card writes are plain ASCII, so they leave without a rewrite.
  if (!NEEDS_ENCODING.test(str)) {
    return str;
  }

  return str.replace(TO_ENCODE, (char) => (char === BACKSPACE ? '' : `&#${char.charCodeAt(0)};`));
};

export { encodeHTML };
