import type { Sink } from './serialize.ts';
import { INDENT, indentAt } from './serialize.ts';

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
 */
const rule = (selector: string, declarations: Declarations): CssNode => ({
  kind: 'rule',
  selector,
  declarations,
});

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

/**
 * Two builds of one stylesheet, as an override of the first by the second: the declarations the
 * second changes, in the rules and at-rules they sit in. A node that does not line up is kept whole.
 *
 * @returns What `next` sets differently from `base`.
 */
const changedBy = (base: Array<CssChild>, next: Array<CssChild>): Array<CssNode> => {
  const before = flatten(base);
  return flatten(next).flatMap((node, index): Array<CssNode> => {
    const was = before[index];
    if (node.kind === 'rule' && was?.kind === 'rule' && was.selector === node.selector) {
      const changed = (Object.keys(node.declarations) as Array<CssProperty>).filter(
        (property) => node.declarations[property] !== was.declarations[property],
      );
      return [
        rule(
          node.selector,
          Object.fromEntries(changed.map((property) => [property, node.declarations[property]])),
        ),
      ];
    }
    if (node.kind === 'at' && was?.kind === 'at' && was.prelude === node.prelude) {
      // a later @keyframes replaces the earlier one whole, so it cannot be trimmed
      if (node.prelude.startsWith('@keyframes')) {
        if (JSON.stringify(flatten(was.children)) === JSON.stringify(flatten(node.children))) {
          return [];
        }
        return [node];
      }
      return [atRule(node.prelude, changedBy(was.children, node.children))];
    }
    if (node.kind === 'comment') {
      return [];
    }
    return [node];
  });
};

export { atRule, changedBy, cssComment, rule, writeCss };
export type { CssChild };
