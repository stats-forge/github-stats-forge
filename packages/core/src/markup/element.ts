import type { CssChild } from './css.js';
import { writeCss } from './css.js';
import { encodeHTML } from './html.js';
import type { Sink } from './serialize.js';
import { indentAt } from './serialize.js';

/**
 * Every element a card draws, closed so `el('circel', …)` is a compile error.
 * `style` is absent on purpose: it comes from `style()`, which takes rules rather than children.
 */
type Tag =
  | 'a'
  | 'circle'
  | 'defs'
  | 'desc'
  | 'div'
  | 'foreignObject'
  | 'g'
  | 'linearGradient'
  | 'mask'
  | 'path'
  | 'rect'
  | 'stop'
  | 'svg'
  | 'text'
  | 'title'
  | 'tspan';

/**
 * Every attribute a card writes, closed like `Tag`:
 * a misspelled `stroke-width` would otherwise be valid TypeScript and invisible in the output.
 */
type Attribute =
  | 'alignment-baseline'
  | 'aria-hidden'
  | 'aria-labelledby'
  | 'class'
  | 'cx'
  | 'cy'
  | 'd'
  | 'data-testid'
  | 'data-view-component'
  | 'dominant-baseline'
  | 'dy'
  | 'fill'
  | 'fill-rule'
  | 'gradientTransform'
  | 'gradientUnits'
  | 'height'
  | 'href'
  | 'id'
  | 'mask'
  | 'offset'
  | 'r'
  | 'role'
  | 'rx'
  | 'ry'
  | 'size'
  | 'stop-color'
  | 'stroke'
  | 'stroke-dasharray'
  | 'stroke-dashoffset'
  | 'stroke-linecap'
  | 'stroke-opacity'
  | 'stroke-width'
  | 'style'
  | 'text-anchor'
  | 'transform'
  | 'version'
  | 'viewBox'
  | 'width'
  | 'x'
  | 'xmlns'
  | 'y';

/** An attribute whose value is `undefined` is not written, so a caller can inline a condition. */
type Attributes = Partial<Record<Attribute, string | number | undefined>>;

/** Elements whose character data is part of the rendering, so they stay on one line. */
const INLINE_ELEMENTS: ReadonlySet<Tag> = new Set(['text', 'tspan', 'title', 'desc', 'div']);

interface MarkupElement {
  readonly tag: Tag;
  readonly attributes: Attributes;
  readonly children: Array<Child>;
}

interface StyleElement {
  readonly tag: 'style';
  readonly rules: Array<CssChild>;
}

/** Anything accepted as content; falsy entries drop out, arrays flatten, strings are escaped. */
type Child =
  | MarkupElement
  | StyleElement
  | string
  | number
  | false
  | null
  | undefined
  | Array<Child>;

/** What is left of a child list once the empty entries and the nesting are gone. */
type FlatChild = MarkupElement | StyleElement | string | number;

/**
 * Builds one element. Attribute values and text children are encoded on the way out.
 */
const el = (tag: Tag, attributes: Attributes = {}, ...children: Array<Child>): MarkupElement => ({
  tag,
  attributes,
  children,
});

/**
 * Builds the `<style>` element from a stylesheet rather than from text.
 */
const style = (...rules: Array<CssChild>): StyleElement => ({ tag: 'style', rules });

const isStyle = (child: MarkupElement | StyleElement): child is StyleElement => 'rules' in child;

/** Drops the children that carry nothing and flattens the arrays. */
const flatten = (children: Array<Child>, into: Array<FlatChild> = []): Array<FlatChild> => {
  for (const child of children) {
    if (child === false || child === null || child === undefined || child === '') {
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

const openTag = (node: MarkupElement, selfClosing: boolean): string => {
  let tag = `<${node.tag}`;
  const { attributes } = node;

  // `Object.keys` widens to `string`, so the cast restores what the type already says.
  for (const name of Object.keys(attributes) as Array<Attribute>) {
    const value = attributes[name];
    if (value !== undefined) {
      // A number can hold nothing that needs escaping, so it skips the scan.
      tag += typeof value === 'number' ? ` ${name}="${value}"` : ` ${name}="${encodeHTML(value)}"`;
    }
  }

  return `${tag}${selfClosing ? ' />' : '>'}`;
};

/** Serializes an element and its descendants onto one line, whitespace and all. */
const writeInline = (node: FlatChild): string => {
  if (typeof node === 'string') {
    return encodeHTML(node);
  }
  if (typeof node === 'number') {
    return String(node);
  }
  if (isStyle(node)) {
    return '';
  }

  const children = flatten(node.children);
  if (children.length === 0) {
    return openTag(node, true);
  }

  let inner = '';
  for (const child of children) {
    inner += writeInline(child);
  }
  return `${openTag(node, false)}${inner}</${node.tag}>`;
};

/**
 * A container is written optimistically and rewound if its content turns out empty,
 * so an element that draws nothing costs one walk rather than two.
 */
const write = (node: FlatChild, depth: number, sink: Sink): void => {
  const indent = indentAt(depth);

  if (typeof node === 'string') {
    sink.out += `${indent}${encodeHTML(node)}\n`;
    return;
  }
  if (typeof node === 'number') {
    sink.out += `${indent}${node}\n`;
    return;
  }

  const mark = sink.out.length;

  if (isStyle(node)) {
    sink.out += `${indent}<style>\n`;
    const bodyStart = sink.out.length;
    writeCss(node.rules, depth + 1, sink);
    sink.out =
      sink.out.length === bodyStart ? sink.out.slice(0, mark) : `${sink.out}${indent}</style>\n`;
    return;
  }

  const children = flatten(node.children);
  if (children.length === 0) {
    sink.out += `${indent}${openTag(node, true)}\n`;
    return;
  }

  if (INLINE_ELEMENTS.has(node.tag)) {
    let inner = '';
    for (const child of children) {
      inner += writeInline(child);
    }
    sink.out +=
      inner === ''
        ? `${indent}${openTag(node, true)}\n`
        : `${indent}${openTag(node, false)}${inner}</${node.tag}>\n`;
    return;
  }

  sink.out += `${indent}${openTag(node, false)}\n`;
  const bodyStart = sink.out.length;
  for (const child of children) {
    write(child, depth + 1, sink);
  }
  sink.out =
    sink.out.length === bodyStart
      ? `${sink.out.slice(0, mark)}${indent}${openTag(node, true)}\n`
      : `${sink.out}${indent}</${node.tag}>\n`;
};

/**
 * Serializes a finished card: one element per line, two spaces per nesting level.
 *
 * @returns The rendered SVG.
 */
const renderMarkup = (root: MarkupElement): string => {
  const sink: Sink = { out: '' };
  write(root, 0, sink);
  return sink.out;
};

export { el, renderMarkup, style };
export type { Child, MarkupElement };
