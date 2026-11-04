import { describe, expectTypeOf, it } from 'vitest';

import type { MarkupElement } from '../src/markup/index.ts';
import { el } from '../src/markup/index.ts';

describe('markup element types', () => {
  it('should accept an attribute on an element it applies to', () => {
    expectTypeOf(el('stop', { offset: '0%', 'stop-color': '#fff' })).toExtend<MarkupElement>();
    expectTypeOf(el('g', { fill: '#fff', 'text-anchor': 'middle' })).toExtend<MarkupElement>();
    expectTypeOf(el('rect', { x: 0, rx: 4, 'data-testid': 'bar' })).toEqualTypeOf<
      MarkupElement<'rect'>
    >();
  });

  it('should reject an attribute on an element it does not apply to', () => {
    // @ts-expect-error a gradient stop takes `stop-color`, not paint
    el('stop', { fill: '#fff' });
    // @ts-expect-error `transform` applies to graphics elements, which a `tspan` is not
    el('tspan', { transform: 'rotate(1)' });
    // @ts-expect-error `r` belongs to a circle
    el('rect', { r: 4 });
    // @ts-expect-error not an SVG attribute
    el('circle', { size: 100 });
    // @ts-expect-error not an element a card draws
    el('circel', {});
  });
});
