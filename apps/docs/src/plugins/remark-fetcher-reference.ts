import type { RemarkPlugin } from '@astrojs/markdown-remark';

import type { Fetcher } from './fetcher-reference.ts';
import { fetchers } from './fetcher-reference.ts';

/**
 * @file `<!-- api: fetchStats -->` becomes that fetcher's reference.
 *
 * The signature, every option and what comes back are read from core's own doc comment at build
 * time, so a page cannot describe a function core no longer has, and nothing generated is
 * committed. The prose around the marker is hand-written and untouched.
 *
 * **`astro dev` does not pick up an edit to core's doc comments — restart it.** Astro re-renders a
 * page when its own markdown's digest changes, and a doc comment in `packages/core` does not touch
 * that, so the content layer keeps serving the page it rendered at startup. Making it refresh is
 * possible — a loader wrapping `docsLoader()` that drops the `fetchers/` entries, plus an
 * integration calling `refreshContent` from `astro:server:setup` — and it was built, measured
 * against what it protects, and deleted: 81 lines to save a restart, on pages whose reference is
 * mostly type signatures. Do not rebuild it without that argument having changed.
 *
 * Three simpler routes fail outright, so don't try them either: the store's own mtime always
 * looks newer (every run rewrites it); deleting `data-store.json` under a running server empties
 * the collection and Starlight then fails on the first slug it looks up; and `server.restart()`
 * never re-runs `astro:config:done`.
 */

/** The marker a page leaves where its reference goes. */
const MARKER = /^<!--\s*api:\s*(?<name>\w+)\s*-->$/;

/**
 * A cell that cannot break the table it sits in.
 *
 * @returns The text, with its pipes escaped.
 */
const cell = (text: string): string => text.replaceAll('|', String.raw`\|`);

/**
 * @returns The reference, as markdown.
 */
const render = ({ name, summary, options, returnType, returns }: Fetcher): string =>
  [
    summary,
    '',
    '```ts',
    `${name}(options, config: CardConfig): ${returnType}`,
    '```',
    '',
    ...(options.length === 0
      ? []
      : [
          '| Option | Type | Required | What it is |',
          '| --- | --- | --- | --- |',
          ...options.map(
            (option) =>
              `| \`${option.name}\` | \`${cell(option.type)}\` | ${option.optional ? 'no' : 'yes'} | ${cell(option.doc) || '—'} |`,
          ),
          '',
        ]),
    `**Returns** \`${returnType}\`${returns ? ` — ${returns}` : ''}`,
  ].join('\n');

export const remarkFetcherReference: RemarkPlugin = function remarkFetcherReference() {
  // The processor parses the reference with the same configuration as the page it lands in,
  // so a table here is a table there.
  const parse = this.parse.bind(this);

  return (tree, file) => {
    type Node = (typeof tree.children)[number];

    const expand = (children: Array<Node>): void => {
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (child?.type !== 'html') {
          continue;
        }

        const name = MARKER.exec(child.value.trim())?.groups?.['name'];
        if (name === undefined) {
          continue;
        }

        const fetcher = fetchers().get(name);
        if (!fetcher) {
          throw new Error(
            `${file.path}: core exports no fetcher called "${name}". The marker is \`<!-- api: <fetcher> -->\`.`,
          );
        }

        // `parse` is typed as returning unified's generic node; the processor is mdast's.
        const parsed = parse(render(fetcher)) as typeof tree;
        children.splice(index, 1, ...parsed.children);
      }
    };

    expand(tree.children);
  };
};
