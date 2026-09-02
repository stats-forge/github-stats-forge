import fs from 'node:fs';

const EMOJI_FILEPATH = './src/common/emojiMap.json';

/** GitHub's shortcode preset, keyed by hexcode. */
type Shortcodes = Record<string, string | Array<string>>;

/** The hexcode -> unicode table, one entry per emoji. */
type Compact = Array<{ hexcode: string; unicode: string }>;

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

const emojibase = <T>(name: string): Promise<T> =>
  fetchJson<T>(`https://cdn.jsdelivr.net/npm/emojibase-data@${version}/en/${name}.json`);

const [shortcodes, compact] = await Promise.all([
  emojibase<Shortcodes>('shortcodes/github'),
  emojibase<Compact>('compact'),
]);

const unicodeByHexcode = new Map(compact.map((emoji) => [emoji.hexcode, emoji.unicode]));

const emojiMap: Record<string, string> = {};

for (const [hexcode, names] of Object.entries(shortcodes)) {
  const unicode = unicodeByHexcode.get(hexcode);
  if (unicode === undefined) {
    continue;
  }
  for (const name of Array.isArray(names) ? names : [names]) {
    emojiMap[name] = unicode;
  }
}

// A shortcode set this much smaller than GitHub's means the source changed shape.
const total = Object.keys(emojiMap).length;
if (total < 1500) {
  throw new Error(`Only ${String(total)} shortcodes resolved; refusing to write.`);
}

// Written the way the formatter would, so a regenerated file passes `format:check` as-is.
fs.writeFileSync(EMOJI_FILEPATH, JSON.stringify(emojiMap, null, 2) + '\n');
