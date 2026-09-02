/**
 * The markup layer: a card is built as a tree of elements and rules, then serialized once.
 * It depends on nothing else in the package, so it sits below `cards/`, not inside `common/`.
 */

export { atRule, cssComment, rule } from './css.js';
export type { CssChild, Declarations } from './css.js';
export { el, renderMarkup, style } from './element.js';
export type { Child, MarkupElement } from './element.js';
