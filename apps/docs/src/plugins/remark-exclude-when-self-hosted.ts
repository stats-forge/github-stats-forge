/**
 * @file Cuts what lies between `<!-- exclude-when-self-hosted -->` and its closing
 * `<!-- /exclude-when-self-hosted -->` from a self-hosted build, at any depth: a markdown page
 * cannot know what is serving it.
 */

import type { RemarkPlugin } from '@astrojs/markdown-remark';

import { SERVED_BY_INSTANCE } from '../constants.ts';

const OPEN = /^<!--\s*exclude-when-self-hosted\s*-->$/;
const CLOSE = /^<!--\s*\/exclude-when-self-hosted\s*-->$/;

export const remarkExcludeWhenSelfHosted: RemarkPlugin = () => (tree, file) => {
  type Node = (typeof tree.children)[number];

  /** @returns Whether the node is the marker `pattern` matches. */
  const isMarker = (node: Node, pattern: RegExp): boolean =>
    node.type === 'html' && pattern.test(node.value.trim());

  const cut = (children: Array<Node>): void => {
    // backwards, so each splice leaves the indexes still to visit alone
    let end: number | undefined;
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (child === undefined) {
        continue;
      }
      if (isMarker(child, CLOSE)) {
        end = index;
      } else if (isMarker(child, OPEN)) {
        if (end === undefined) {
          throw new Error(
            `${file.path}: a <!-- exclude-when-self-hosted --> is never closed in the same block.`,
          );
        }
        // Pages keeps what they wrap, but not the markers, which would be written into the page
        const kept = SERVED_BY_INSTANCE ? [] : children.slice(index + 1, end);
        children.splice(index, end - index + 1, ...kept);
        end = undefined;
      } else if ('children' in child) {
        cut(child.children);
      }
    }
  };

  cut(tree.children);
};
