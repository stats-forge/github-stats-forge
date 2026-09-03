/**
 * What the markup and stylesheet serializers share: where output goes, and how deep a line sits.
 * Both write into one growing string rather than a list of chunks, so nothing needs joining.
 */

const INDENT = '  ';

/** Collects serializer output. A plain holder so appends stay a property write. */
interface Sink {
  out: string;
}

/** Indentation by depth, grown as the tree is walked rather than rebuilt per line. */
const indents = ['', INDENT];

/**
 * @returns Two spaces per level.
 */
const indentAt = (depth: number): string => {
  for (let i = indents.length; i <= depth; i += 1) {
    indents.push(`${indents[i - 1] ?? ''}${INDENT}`);
  }
  return indents[depth] ?? '';
};

export { INDENT, indentAt };
export type { Sink };
