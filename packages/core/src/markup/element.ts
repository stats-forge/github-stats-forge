import type { CssChild } from './css.ts';
import { writeCss } from './css.ts';
import { encodeHTML } from './html.ts';
import type { Sink } from './serialize.ts';
import { indentAt } from './serialize.ts';

/** Valid on any element; `data-*` is global. */
type CoreAttribute = 'class' | 'data-size' | 'data-testid' | 'data-view-component' | 'id' | 'style';

/** SVG 2 allows `role` and `aria-*` only on what renders: containers, shapes and text. */
type AriaAttribute = 'aria-hidden' | 'aria-labelledby' | 'role';

/** Fill and stroke paint shapes and text, and inherit, so a container may set them too. */
type PaintAttribute =
  | 'fill'
  | 'fill-opacity'
  | 'fill-rule'
  | 'stroke'
  | 'stroke-dasharray'
  | 'stroke-dashoffset'
  | 'stroke-linecap'
  | 'stroke-opacity'
  | 'stroke-width';

/** Inherited text layout, so a container may set it for the text inside. */
type TextLayoutAttribute = 'dominant-baseline' | 'text-anchor';

/** What applies to graphics elements and containers alone: not to a `tspan`, nor a gradient. */
type GraphicsAttribute = 'filter' | 'mask' | 'transform';

type ContainerAttribute =
  | CoreAttribute
  | AriaAttribute
  | PaintAttribute
  | TextLayoutAttribute
  | GraphicsAttribute;

type ShapeAttribute = CoreAttribute | AriaAttribute | PaintAttribute | GraphicsAttribute;

/** `alignment-baseline` is not inherited, so only the text elements take it. */
type TextAttribute =
  | CoreAttribute
  | AriaAttribute
  | PaintAttribute
  | TextLayoutAttribute
  | 'alignment-baseline'
  | 'dy'
  | 'x'
  | 'y';

type Region = 'height' | 'width' | 'x' | 'y';

/**
 * Every element a card draws, and the attributes each may carry, closed on both counts:
 * `el('circel', …)` and a `stroke-width` on a `stop` are compile errors, not dropped output.
 * `style` is absent on purpose: it comes from `style()`, which takes rules rather than children.
 */
interface ElementAttributes {
  a: ContainerAttribute | 'href';
  circle: ShapeAttribute | 'cx' | 'cy' | 'r';
  defs: CoreAttribute;
  desc: CoreAttribute;
  feComponentTransfer: CoreAttribute | 'in' | 'result';
  feFuncA: CoreAttribute | 'slope' | 'type';
  feGaussianBlur: CoreAttribute | Region | 'in' | 'result' | 'stdDeviation';
  filter: CoreAttribute | Region;
  g: ContainerAttribute;
  linearGradient: CoreAttribute | 'gradientTransform' | 'gradientUnits' | 'x1' | 'x2' | 'y1' | 'y2';
  mask: CoreAttribute | Region;
  path: ShapeAttribute | 'd';
  radialGradient: CoreAttribute | 'cx' | 'cy' | 'gradientTransform' | 'gradientUnits' | 'r';
  rect: ShapeAttribute | Region | 'rx' | 'ry';
  stop: CoreAttribute | 'offset' | 'stop-color' | 'stop-opacity';
  svg: ContainerAttribute | Region | 'version' | 'viewBox' | 'xmlns';
  text: TextAttribute | GraphicsAttribute;
  title: CoreAttribute;
  tspan: TextAttribute;
}

type Tag = keyof ElementAttributes;

/** An attribute whose value is `undefined` is not written, so a caller can inline a condition. */
type Attributes<T extends Tag> = Partial<Record<ElementAttributes[T], string | number | undefined>>;

/** Elements whose character data is part of the rendering, so they stay on one line. */
const INLINE_ELEMENTS: ReadonlySet<Tag> = new Set(['text', 'tspan', 'title', 'desc']);

/** Defaults to any element, which is what a parent holds and the serializer walks. */
interface MarkupElement<T extends Tag = Tag> {
  readonly tag: T;
  readonly attributes: Attributes<T>;
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
const el = <T extends Tag>(
  tag: T,
  attributes: Attributes<T> = {},
  ...children: Array<Child>
): MarkupElement<T> => ({
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
  for (const name of Object.keys(attributes) as Array<keyof Attributes<Tag>>) {
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
export type { Attributes, Child, MarkupElement };
