import fs from 'node:fs';

import { fetchOk } from './download.ts';
import { buildEmojiMap } from './emoji-map.ts';

const EMOJI_FILEPATH = './src/common/emojiMap.json';

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetchOk(url);
  return response.json();
};

// Resolved rather than pinned, so a Unicode major lands in the scheduled PR instead of
// waiting for someone to notice. `emoji-name-map` sat nine majors behind for this reason.
// A wrong version 404s on the CDN, which `fetchOk` refuses.
const { version } = (await fetchJson('https://registry.npmjs.org/emojibase-data/latest')) as {
  version: string;
};
console.log(`emojibase-data@${version}`);

const emojibase = async (name: string): Promise<unknown> =>
  fetchJson(`https://cdn.jsdelivr.net/npm/emojibase-data@${version}/en/${name}.json`);

const [shortcodes, compact] = await Promise.all([
  emojibase('shortcodes/github'),
  emojibase('compact'),
]);

const emojiMap = buildEmojiMap({ shortcodes, compact });

// Written the way the formatter would, so a regenerated file passes `format:check` as-is.
fs.writeFileSync(EMOJI_FILEPATH, `${JSON.stringify(emojiMap, null, 2)}\n`);
