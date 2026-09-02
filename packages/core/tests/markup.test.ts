import { describe, expect, it } from 'vitest';

import { atRule, cssComment, rule } from '../src/markup/index.js';
import { el, renderMarkup, style } from '../src/markup/index.js';

describe('renderMarkup', () => {
  it('should write one element per line, two spaces per level', () => {
    expect(renderMarkup(el('svg', { width: 10 }, el('g', {}, el('rect', { x: 0, y: 1.5 })))))
      .toMatchInlineSnapshot(`
      "<svg width="10">
        <g>
          <rect x="0" y="1.5" />
        </g>
      </svg>
      "
    `);
  });

  it('should leave out an attribute whose value is undefined', () => {
    expect(renderMarkup(el('rect', { x: 0, transform: undefined, fill: '#fff' })))
      .toMatchInlineSnapshot(`
      "<rect x="0" fill="#fff" />
      "
    `);
  });

  it('should drop the children that carry nothing, and flatten the arrays', () => {
    expect(
      renderMarkup(el('g', {}, undefined, false, null, '', [el('rect', {}), [el('circle', {})]])),
    ).toMatchInlineSnapshot(`
      "<g>
        <rect />
        <circle />
      </g>
      "
    `);
  });

  it('should write an element with no children self-closing', () => {
    expect(renderMarkup(el('g', { class: 'a' }, undefined))).toMatchInlineSnapshot(`
      "<g class="a" />
      "
    `);
  });

  it('should keep a whitespace-sensitive element on one line', () => {
    expect(
      renderMarkup(
        el('text', { class: 'stat' }, el('tspan', { x: 0 }, 'one'), el('tspan', { x: 0 }, 'two')),
      ),
    ).toMatchInlineSnapshot(`
      "<text class="stat"><tspan x="0">one</tspan><tspan x="0">two</tspan></text>
      "
    `);
  });

  it('should keep a zero child, which carries a value', () => {
    expect(renderMarkup(el('text', {}, 0))).toMatchInlineSnapshot(`
      "<text>0</text>
      "
    `);
  });

  it('should escape text children and attribute values', () => {
    expect(renderMarkup(el('text', { 'data-testid': '<i>' }, "<script>alert('xss')</script>")))
      .toMatchInlineSnapshot(`
      "<text data-testid="&#60;i&#62;">&#60;script&#62;alert(&#39;xss&#39;)&#60;/script&#62;</text>
      "
    `);
  });

  it('should render a stylesheet inside the style element', () => {
    expect(
      renderMarkup(
        el(
          'svg',
          {},
          style(
            rule('.header', { fill: '#000', 'font-size': undefined }),
            atRule(
              '@media (prefers-color-scheme: dark)',
              cssComment('night'),
              rule('.header', { fill: '#fff' }),
            ),
          ),
        ),
      ),
    ).toMatchInlineSnapshot(`
      "<svg>
        <style>
          .header {
            fill: #000;
          }
          @media (prefers-color-scheme: dark) {
            /* night */
            .header {
              fill: #fff;
            }
          }
        </style>
      </svg>
      "
    `);
  });

  it('should leave out a rule with nothing to declare, and the block that held only it', () => {
    expect(
      renderMarkup(el('svg', {}, style(rule('.a', { fill: undefined }), atRule('@media print')))),
    ).toMatchInlineSnapshot(`
      "<svg />
      "
    `);
  });
});
