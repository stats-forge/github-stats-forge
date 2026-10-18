/**
 * @file What the card specs read off a drawn card, so a test says what it checks rather than how
 * to dig it out of the SVG.
 */

import { screen } from '@testing-library/dom';
import { cssToObject } from '@uppercod/css-to-object';

/**
 * Puts a card into the document.
 *
 * @returns The card's root `<svg>`.
 */
const draw = (svg: string): SVGSVGElement => {
  document.body.innerHTML = svg;
  const root = document.querySelector('svg');
  if (!root) {
    throw new Error('no <svg> was drawn');
  }
  return root;
};

/**
 * A declaration of the drawn card's light-mode rule for `selector`.
 *
 * @returns The value as written, or `undefined` when the rule does not declare it.
 */
const cssValue = (selector: string, property: string): string | undefined =>
  cssToObject(document.querySelector('style')?.textContent ?? '')[':host']?.[`${selector} `]?.[
    property
  ]?.trim();

/**
 * Where an element's own `translate(x, y)` puts it, which is how a card places a group.
 *
 * @returns The offset, `0` on an axis the element does not move along.
 */
const translateOf = (element: Element | null | undefined): { x: number; y: number } => {
  const { x = '0', y = '0' } =
    /translate\((?<x>-?[\d.]+),\s*(?<y>-?[\d.]+)\)/u.exec(element?.getAttribute('transform') ?? '')
      ?.groups ?? {};
  return { x: Number(x), y: Number(y) };
};

/**
 * Where an element starts across the card: its own `x`, plus the offset of every group and nested
 * `<svg>` around it.
 *
 * @returns The x, in the root `<svg>`'s units.
 */
const xOf = (element: Element): number => {
  let x = Number(element.getAttribute('x') ?? 0);
  for (let parent = element.parentElement; parent?.parentElement; parent = parent.parentElement) {
    x += parent.tagName === 'svg' ? Number(parent.getAttribute('x') ?? 0) : translateOf(parent).x;
  }
  return x;
};

/** @returns Those of `ids` the drawn card carries a test id for, in the order given. */
const drawnIds = (ids: ReadonlyArray<string>): Array<string> =>
  ids.filter((id) => screen.queryByTestId(id) !== null);

/**
 * The reduced-motion media block carries the same declaration as the unconditional rule, so
 * finding it at all proves nothing about the option.
 *
 * @returns 1 when only reduced-motion stops the animation, 2 when the card stops it outright.
 */
const noMotionRules = (): number =>
  (document.querySelector('style')?.textContent ?? '').split('animation-duration: 0s !important')
    .length - 1;

export { cssValue, draw, drawnIds, noMotionRules, translateOf, xOf };
