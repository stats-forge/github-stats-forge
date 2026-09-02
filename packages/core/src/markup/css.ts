import type { Sink } from './serialize.js';
import { INDENT, indentAt } from './serialize.js';

/** Every CSS property a card declares, closed so a typo is a compile error, not a dropped rule. */
type CssProperty =
  | '-webkit-box-orient'
  | '-webkit-line-clamp'
  | 'animation'
  | 'animation-delay'
  | 'animation-duration'
  | 'color'
  | 'display'
  | 'fill'
  | 'font'
  | 'font-size'
  | 'font-variant-numeric'
  | 'font-weight'
  | 'line-clamp'
  | 'line-height'
  | 'margin'
  | 'opacity'
  | 'overflow'
  | 'overflow-wrap'
  | 'padding-bottom'
  | 'stroke'
  | 'stroke-dasharray'
  | 'stroke-dashoffset'
  | 'stroke-linecap'
  | 'stroke-width'
  | 'text-overflow'
  | 'transform'
  | 'transform-origin'
  | 'width'
  | 'word-break';

/** A declaration whose value is `undefined` is left out, so a caller can inline a condition. */
type Declarations = Partial<Record<CssProperty, string | number | undefined>>;

type CssNode =
  | { readonly kind: 'rule'; readonly selector: string; readonly declarations: Declarations }
  | { readonly kind: 'at'; readonly prelude: string; readonly children: Array<CssChild> }
  | { readonly kind: 'comment'; readonly text: string };

/** Anything accepted where CSS is expected; falsy entries drop out, arrays flatten. */
type CssChild = CssNode | false | null | undefined | Array<CssChild>;

/**
 * Selectors stay free-form: they compose (`.badge rect`), and a keyframe stop is one too (`from`).
 *
 * @param selector The selector the declarations apply to.
 * @param declarations Property/value pairs; a `undefined` value is left out.
 */
const rule = (selector: string, declarations: Declarations): CssNode => ({
  kind: 'rule',
  selector,
  declarations,
});

/**
 * @param prelude The at-rule and its condition, e.g. `@media (prefers-color-scheme: dark)`.
 * @param children The rules it wraps.
 */
const atRule = (prelude: string, ...children: Array<CssChild>): CssNode => ({
  kind: 'at',
  prelude,
  children,
});

const cssComment = (text: string): CssNode => ({ kind: 'comment', text });

/** Drops the rules that carry nothing and flattens the arrays. */
const flatten = (children: Array<CssChild>, into: Array<CssNode> = []): Array<CssNode> => {
  for (const child of children) {
    if (!child) {
      continue;
    }
    if (Array.isArray(child)) {
      flatten(child, into);
    } else {
      into.push(child);
    }
  }
  return into;
};

/**
 * Serializes a stylesheet, dropping every rule that would have come out empty.
 *
 * A block is written optimistically and rewound if its body turns out empty,
 * so the tree is walked once however deeply the at-rules nest.
 *
 * @param children The rules to write.
 * @param depth Nesting level, one `INDENT` each.
 * @param sink Collects the output.
 */
const writeCss = (children: Array<CssChild>, depth: number, sink: Sink): void => {
  const indent = indentAt(depth);

  for (const node of flatten(children)) {
    if (node.kind === 'comment') {
      sink.out += `${indent}/* ${node.text} */\n`;
      continue;
    }

    const mark = sink.out.length;

    if (node.kind === 'at') {
      sink.out += `${indent}${node.prelude} {\n`;
      const bodyStart = sink.out.length;
      writeCss(node.children, depth + 1, sink);
      sink.out =
        sink.out.length === bodyStart ? sink.out.slice(0, mark) : `${sink.out}${indent}}\n`;
      continue;
    }

    sink.out += `${indent}${node.selector} {\n`;
    const bodyStart = sink.out.length;
    for (const property of Object.keys(node.declarations) as Array<CssProperty>) {
      const value = node.declarations[property];
      if (value !== undefined) {
        sink.out += `${indent}${INDENT}${property}: ${String(value)};\n`;
      }
    }
    sink.out = sink.out.length === bodyStart ? sink.out.slice(0, mark) : `${sink.out}${indent}}\n`;
  }
};

export { atRule, cssComment, rule, writeCss };
export type { CssChild, Declarations };
