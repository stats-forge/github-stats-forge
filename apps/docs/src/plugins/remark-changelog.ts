/**
 * @file `<!-- changelog: apps/server -->` becomes that package's `CHANGELOG.md`, read at build
 * time, so the page holds every release changesets wrote and nothing is committed twice.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { RemarkPlugin } from '@astrojs/markdown-remark';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** The marker a page leaves where a package's releases go. */
const MARKER = /^<!--\s*changelog:\s*(?<dir>[\w/-]+)\s*-->$/;

/**
 * The file as it sits under a page's own `##` heading: its `#` title dropped, every heading one
 * level deeper, and the "Updated dependencies" entries gone, the dependency's own section saying
 * what changed.
 *
 * @returns The markdown to splice in.
 */
const asSection = (changelog: string): string =>
  changelog
    .replace(/^# .*\n/, '')
    .replaceAll(/^(?<hashes>#{2,5}) /gm, '#$<hashes> ')
    .replaceAll(/^- Updated dependencies[^\n]*\n(?: {2}- [^\n]*\n)*/gm, '');

export const remarkChangelog: RemarkPlugin = function remarkChangelog() {
  const parse = this.parse.bind(this);

  return (tree, file) => {
    for (let index = tree.children.length - 1; index >= 0; index -= 1) {
      const child = tree.children[index];
      if (child?.type !== 'html') {
        continue;
      }

      const dir = MARKER.exec(child.value.trim())?.groups?.['dir'];
      if (dir === undefined) {
        continue;
      }

      let changelog: string;
      try {
        changelog = readFileSync(resolve(REPO_ROOT, dir, 'CHANGELOG.md'), 'utf8');
      } catch {
        throw new Error(`${file.path}: ${dir} has no CHANGELOG.md to place here.`);
      }

      // `parse` is typed as returning unified's generic node; the processor is mdast's.
      const parsed = parse(asSection(changelog)) as typeof tree;
      tree.children.splice(index, 1, ...parsed.children);
    }
  };
};
