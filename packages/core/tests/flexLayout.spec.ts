import { describe, expect, it } from 'vitest';

import { flexLayout } from '../src/common/render.ts';
import { el, renderMarkup } from '../src/markup/index.ts';
import type { Child } from '../src/markup/index.ts';

/** Renders a layout in the group a card would place it in, so the snapshot shows the offsets. */
const layout = (items: Array<Child>): string => renderMarkup(el('g', {}, items));

const texts = (count: number): Array<Child> =>
  Array.from({ length: count }, (_, i) => el('text', {}, i + 1));

describe(flexLayout, () => {
  it('should lay items out in a row', () => {
    expect(layout(flexLayout({ items: texts(2), gap: 60 }))).toMatchInlineSnapshot(`
      "<g>
        <g>
          <text>1</text>
        </g>
        <g transform="translate(60, 0)">
          <text>2</text>
        </g>
      </g>
      "
    `);
  });

  it('should lay items out in a column', () => {
    expect(layout(flexLayout({ items: texts(2), gap: 60, direction: 'column' })))
      .toMatchInlineSnapshot(`
      "<g>
        <g>
          <text>1</text>
        </g>
        <g transform="translate(0, 60)">
          <text>2</text>
        </g>
      </g>
      "
    `);
  });

  it('should offset each item by the one before it', () => {
    expect(layout(flexLayout({ items: texts(4), gap: 20, sizes: [200, 100, 55, 25] })))
      .toMatchInlineSnapshot(`
      "<g>
        <g>
          <text>1</text>
        </g>
        <g transform="translate(220, 0)">
          <text>2</text>
        </g>
        <g transform="translate(340, 0)">
          <text>3</text>
        </g>
        <g transform="translate(415, 0)">
          <text>4</text>
        </g>
      </g>
      "
    `);
  });

  it('should leave a lone item ungrouped, and skip the items that carry nothing', () => {
    expect(layout(flexLayout({ items: [undefined, el('text', {}, 1), false], gap: 60 })))
      .toMatchInlineSnapshot(`
      "<g>
        <text>1</text>
      </g>
      "
    `);
  });

  it('should reject sizes that are not numbers', () => {
    expect(() => flexLayout({ items: [el('text', {}, 1)], gap: 0, sizes: [Number.NaN] })).toThrow(
      'flexLayout: `sizes` must contain only numbers',
    );
  });
});
