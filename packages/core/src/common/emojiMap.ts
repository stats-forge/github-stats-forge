import emojiMapJson from './emojiMap.json' with { type: 'json' };

// The generated JSON types has literal keys; index it as a plain lookup table.
const emojiMap: Record<string, string> = emojiMapJson;

/**
 * Resolves a GitHub emoji shortcode to its unicode character.
 *
 * @returns The emoji, or `undefined` when GitHub has no such shortcode.
 */
const getEmoji = (name: string): string | undefined => emojiMap[name];

export { getEmoji };
