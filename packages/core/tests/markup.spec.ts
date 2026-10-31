import { describe, expect, it } from 'vitest';

import {
  atRule,
  changedBy,
  cssComment,
  rule,
  el,
  renderMarkup,
  style,
} from '../src/markup/index.ts';

describe(renderMarkup, () => {
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
    expect(renderMarkup(el('g', { class: 'a' }))).toMatchInlineSnapshot(`
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

/** @returns The override `next` makes of `base`, as the stylesheet it writes. */
const written = (...[base, next]: Parameters<typeof changedBy>): string =>
  renderMarkup(el('svg', {}, style(changedBy(base, next))));

/** @returns One rule built for one scheme's fill. */
const statRule = (fill: string): ReturnType<typeof rule> =>
  rule('.stat', { font: '400 14px sans', fill });

/** @returns One at-rule built for one scheme's fill. */
const printRule = (fill: string): ReturnType<typeof atRule> =>
  atRule('@media print', rule('.a', { fill, opacity: 1 }));

/** @returns Keyframes whose first stop is built for one scheme's fill. */
const growKeyframes = (fill: string): ReturnType<typeof atRule> =>
  atRule('@keyframes grow', rule('from', { fill, opacity: 0 }), rule('to', { opacity: 1 }));

describe(changedBy, () => {
  it('keeps only the declarations the second build changes', () => {
    const css = written([statRule('#000')], [statRule('#fff')]);
    expect(css).toContain('.stat {');
    expect(css).toContain('fill: #fff;');
    expect(css).not.toContain('font');
  });

  it('drops a rule, an at-rule and a comment nothing changed', () => {
    const same = [
      cssComment('note'),
      rule('.a', { opacity: 0.5 }),
      atRule('@keyframes grow', rule('from', { width: 0 })),
    ];

    expect(written(same, same)).toBe('<svg />\n');
  });

  it('looks inside an at-rule', () => {
    const css = written([printRule('#000')], [printRule('#fff')]);
    expect(css).toContain('fill: #fff;');
    expect(css).not.toContain('opacity');
  });

  it('keeps a changed @keyframes whole, since a later one replaces it', () => {
    const css = written([growKeyframes('#000')], [growKeyframes('#fff')]);

    expect(css).toContain('fill: #fff;');
    expect(css).toContain('opacity: 0;');
    expect(css).toContain('opacity: 1;');
  });

  it('keeps a node whole when the two builds do not line up', () => {
    expect(written([rule('.a', { fill: '#000' })], [rule('.b', { fill: '#000' })])).toContain(
      '.b {\n      fill: #000;',
    );
  });
});
