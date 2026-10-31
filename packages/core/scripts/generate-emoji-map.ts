import fs from 'node:fs';

import { buildEmojiMap } from './emoji-map.ts';
import type { Compact, Shortcodes } from './emoji-map.ts';

const EMOJI_FILEPATH = './src/common/emojiMap.json';

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${String(response.status)} ${response.statusText} for ${url}`);
  }
  return (await response.json()) as T;
};

// Resolved rather than pinned, so a Unicode major lands in the scheduled PR instead of
// waiting for someone to notice. `emoji-name-map` sat nine majors behind for this reason.
const { version } = await fetchJson<{ version: string }>(
  'https://registry.npmjs.org/emojibase-data/latest',
);
console.log(`emojibase-data@${version}`);

const emojibase = async <T>(name: string): Promise<T> =>
  fetchJson<T>(`https://cdn.jsdelivr.net/npm/emojibase-data@${version}/en/${name}.json`);

const [shortcodes, compact] = await Promise.all([
  emojibase<Shortcodes>('shortcodes/github'),
  emojibase<Compact>('compact'),
]);

const emojiMap = buildEmojiMap(shortcodes, compact);

// Written the way the formatter would, so a regenerated file passes `format:check` as-is.
fs.writeFileSync(EMOJI_FILEPATH, `${JSON.stringify(emojiMap, null, 2)}\n`);
