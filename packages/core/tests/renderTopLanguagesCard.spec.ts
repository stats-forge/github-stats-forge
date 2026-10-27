import { screen } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import {
  cartesianToPolar,
  degreesToRadians,
  getCircleLength,
  polarToCartesian,
  radiansToDegrees,
} from '../src/cards/top-languages/geometry.ts';
import {
  MIN_CARD_WIDTH,
  getDefaultLanguagesCountByLayout,
  renderTopLanguages,
  trimTopLanguages,
} from '../src/cards/top-languages/index.ts';
import {
  calculateCompactLayoutHeight,
  calculateDonutLayoutHeight,
  calculateDonutVerticalLayoutHeight,
  calculateNormalLayoutHeight,
  calculatePieLayoutHeight,
} from '../src/cards/top-languages/layouts.ts';
import { measureText } from '../src/common/text.ts';
import type { Lang, TopLangData } from '../src/fetchers/types.ts';
import { themes } from '../src/themes/index.ts';

import { cssValue, draw, exactly, translateOf, xOf } from './_card.ts';
import { approxNumber } from './utils.ts';

const langs = {
  HTML: { color: '#0f0', name: 'HTML', size: 200, count: 1 },
  javascript: { color: '#0ff', name: 'javascript', size: 200, count: 1 },
  css: { color: '#ff0', name: 'css', size: 100, count: 1 },
} satisfies TopLangData;

/** `langs` plus a fourth language, whose name is long enough to need room of its own. */
const withJupyter = {
  ...langs,
  jupyter: { color: '#f80', name: 'Jupyter Notebook', size: 50, count: 1 },
} satisfies TopLangData;

/** What `langs` draws, in order: each label and the share of the chart it takes. */
const SLICES = [
  { label: 'HTML 40.00%', percent: 40 },
  { label: 'javascript 40.00%', percent: 40 },
  { label: 'css 20.00%', percent: 20 },
];

/** @returns The numbers of a path's `d`, its commands dropped. */
const pathNumbers = (element: Element | undefined): Array<number> =>
  (element?.getAttribute('d') ?? '')
    .split(' ')
    .filter((part) => !Number.isNaN(Number(part)))
    .map(Number);

/** @returns The share of the donut a slice takes, read off where its arc starts and ends. */
const donutPercent = (slice: Element | undefined, center: { x: number; y: number }): number => {
  const d = pathNumbers(slice);
  const end = cartesianToPolar(center.x, center.y, d[0] ?? 0, d[1] ?? 0).angleInDegrees + 90;
  let start = cartesianToPolar(center.x, center.y, d[7] ?? 0, d[8] ?? 0).angleInDegrees + 90;
  if (start > end) {
    start -= 360;
  }
  return (end - start) / 3.6;
};

/** @returns The share of the pie a slice takes, read off the two points its arc joins. */
const piePercent = (slice: Element | undefined, center: { x: number; y: number }): number => {
  const d = pathNumbers(slice);
  const start = cartesianToPolar(center.x, center.y, d[2] ?? 0, d[3] ?? 0).angleInDegrees;
  const end = cartesianToPolar(center.x, center.y, d[9] ?? 0, d[10] ?? 0).angleInDegrees;
  return ((end - start) / 360) * 100;
};

/** @returns The share of the vertical donut a ring takes, from its dash offset to the next one's. */
const ringPercent = (rings: Array<Element>, index: number): number => {
  const circumference = Number(rings[0]?.getAttribute('stroke-dasharray'));
  const offset = (ring: Element | undefined): number =>
    Number(ring?.getAttribute('stroke-dashoffset') ?? circumference);
  return ((offset(rings[index + 1]) - offset(rings[index])) / circumference) * 100;
};

/** Asserts the drawn labels, in order, and that there are no more of them. */
const expectLabels = (expected: Array<string>): void => {
  const labels = screen.queryAllByTestId('lang-name');
  expect(labels).toHaveLength(expected.length);
  for (const [index, text] of expected.entries()) {
    expect(labels[index]).toHaveTextContent(exactly(text));
  }
};

describe('Test renderTopLanguages helper functions', () => {
  it.each([0, 90, 180, 270, 360])('converts %i° to radians and back', (degrees) => {
    expect(degreesToRadians(degrees)).toBeCloseTo((degrees * Math.PI) / 180);
    expect(radiansToDegrees((degrees * Math.PI) / 180)).toBeCloseTo(degrees);
  });

  // A circle of radius 60 around (100, 100), every 45°.
  it.each([
    [0, 160, 100],
    [45, 142.42640687119285, 142.42640687119285],
    [90, 100, 160],
    [135, 57.573593128807154, 142.42640687119285],
    [180, 40, 100],
    [225, 57.57359312880714, 57.573593128807154],
    [270, 100, 40],
    [315, 142.42640687119285, 57.57359312880714],
    [360, 160, 100],
  ])('polarToCartesian puts %i° at (%f, %f)', (angle, x, y) => {
    expect(polarToCartesian(100, 100, 60, angle)).toStrictEqual({
      x: approxNumber(x),
      y: approxNumber(y),
    });
  });

  // The same points back, written as `polarToCartesian` rounds them: the last lands at 360°, not 0°.
  it.each([
    [160, 100, 0],
    [142.42640687119285, 142.42640687119285, 45],
    [100, 160, 90],
    [57.573593128807154, 142.42640687119285, 135],
    [40, 100.00000000000001, 180],
    [57.57359312880714, 57.573593128807154, 225],
    [99.99999999999999, 40, 270],
    [142.42640687119285, 57.57359312880714, 315],
    [160, 99.99999999999999, 360],
  ])('cartesianToPolar reads (%f, %f) as %i°', (x, y, angleInDegrees) => {
    expect(cartesianToPolar(100, 100, x, y)).toStrictEqual({
      radius: approxNumber(60),
      angleInDegrees: approxNumber(angleInDegrees),
    });
  });

  // Each height for 0 to 10 languages.
  it.each([
    [
      'compact',
      calculateCompactLayoutHeight,
      [86, 111, 111, 136, 136, 161, 161, 186, 186, 211, 211],
    ],
    [
      'normal',
      calculateNormalLayoutHeight,
      [110, 110, 150, 190, 230, 270, 310, 350, 390, 430, 470],
    ],
    ['donut', calculateDonutLayoutHeight, [205, 205, 205, 205, 205, 214, 246, 278, 310, 342, 374]],
    [
      'donut-vertical',
      calculateDonutVerticalLayoutHeight,
      [300, 325, 325, 350, 350, 375, 375, 400, 400, 425, 425],
    ],
    ['pie', calculatePieLayoutHeight, [300, 325, 325, 350, 350, 375, 375, 400, 400, 425, 425]],
  ])('sizes the %s layout for its language count', (_layout, height, expected) => {
    expect(Array.from({ length: 11 }, (_, count) => height(count))).toStrictEqual(expected);
  });

  it.each([
    [20, 125.663],
    [50, 314.159],
    [100, 628.318],
  ])('getCircleLength(%i) is %f', (radius, length) => {
    expect(getCircleLength(radius)).toBeCloseTo(length);
  });

  it.each([
    ['nothing', {}, 5, undefined, [], 0],
    ['one language', { javascript: langs.javascript }, 5, undefined, [langs.javascript], 200],
    [
      'two languages',
      { javascript: langs.javascript, HTML: langs.HTML },
      5,
      undefined,
      [langs.javascript, langs.HTML],
      400,
    ],
    ['every language', langs, 5, undefined, Object.values(langs), 500],
    [
      'what the count cuts as Other',
      langs,
      2,
      undefined,
      [langs.HTML, langs.javascript, { name: 'Other', color: null, size: 100, count: 1 }],
      500,
    ],
    [
      'a hidden language nowhere, not even in Other',
      langs,
      1,
      ['javascript'],
      [langs.HTML, { name: 'Other', color: null, size: 100, count: 1 }],
      300,
    ],
  ] satisfies Array<[string, TopLangData, number, Array<string> | undefined, Array<Lang>, number]>)(
    'trimTopLanguages keeps %s',
    (_case, data, count, hide, expected, totalLanguageSize) => {
      expect(trimTopLanguages(data, count, hide, 'Other')).toStrictEqual({
        langs: expected,
        totalLanguageSize,
      });
    },
  );

  it.each([
    [{ layout: 'normal' }, 5],
    [{}, 5],
    [{ layout: 'compact' }, 6],
    [{ hide_progress: true }, 6],
    [{ layout: 'donut' }, 5],
    [{ layout: 'donut-vertical' }, 6],
    [{ layout: 'pie' }, 6],
  ] as const)('getDefaultLanguagesCountByLayout(%o) is %i', (options, count) => {
    expect(getDefaultLanguagesCountByLayout(options)).toBe(count);
  });
});

describe('Test renderTopLanguages', () => {
  it('should render correctly', () => {
    draw(renderTopLanguages(langs));

    expect(screen.queryByTestId('header')).toHaveTextContent(exactly('Most Used Languages'));
    expectLabels(['HTML', 'javascript', 'css']);

    const progresses = screen.queryAllByTestId('lang-progress');
    expect(progresses[0]).toHaveAttribute('width', '40%');
    expect(progresses[1]).toHaveAttribute('width', '40%');
    expect(progresses[2]).toHaveAttribute('width', '20%');
  });

  it('should draw full bars where animations do not run', () => {
    draw(renderTopLanguages(langs));

    expect(cssValue('.stagger', 'opacity')).toBeUndefined();
    for (const bar of document.querySelectorAll('.lang-progress')) {
      expect(bar).toHaveAttribute('width', '100%');
    }
  });

  it('should hide languages when hide is passed', () => {
    draw(renderTopLanguages(langs, { hide_langs: ['HTML'] }));
    expectLabels(['javascript', 'css']);

    draw(renderTopLanguages(langs, { hide_langs: ['HTML', 'css'] }));
    expectLabels(['javascript']);
  });

  it('should resize the height correctly depending on langs', () => {
    expect(draw(renderTopLanguages(langs))).toHaveAttribute('height', '190');

    const python: Lang = { color: '#ff0', name: 'python', size: 100, count: 1 };
    expect(draw(renderTopLanguages({ ...langs, python }))).toHaveAttribute('height', '230');
  });

  it('should render with custom width set', () => {
    expect(draw(renderTopLanguages(langs))).toHaveAttribute('width', '300');
    expect(draw(renderTopLanguages(langs, { card_width: 400 }))).toHaveAttribute('width', '400');
  });

  it.each([190, 100])('should raise card_width %i to the minimum', (card_width) => {
    expect(draw(renderTopLanguages(langs, { card_width }))).toHaveAttribute(
      'width',
      String(MIN_CARD_WIDTH),
    );
  });

  it('should render default colors properly', () => {
    draw(renderTopLanguages(langs));

    expect(cssValue('.header', 'fill')).toBe('#2f80ed');
    expect(cssValue('.lang-name', 'fill')).toBe('#434d58');
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', '#fffefe');
  });

  it('should render custom colors properly', () => {
    draw(
      renderTopLanguages(langs, {
        title_color: '5a0',
        icon_color: '1b998b',
        text_color: '9991',
        bg_color: '252525',
        prog_bar_bg_color: '444',
      }),
    );

    expect(cssValue('.header', 'fill')).toBe('#5a0');
    expect(cssValue('.lang-name', 'fill')).toBe('#9991');
    expect(cssValue('.progress-background', 'fill')).toBe('#444');
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', '#252525');
    expect(screen.queryAllByTestId('progress-background').length).toBeGreaterThan(0);
  });

  it('should render custom colors with themes', () => {
    draw(renderTopLanguages(langs, { title_color: '5a0', theme: 'radical' }));

    expect(cssValue('.header', 'fill')).toBe('#5a0');
    expect(cssValue('.lang-name', 'fill')).toBe(`#${themes.radical.text_color}`);
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', `#${themes.radical.bg_color}`);
  });

  it.each(Object.entries(themes))('should render with the %s theme', (theme, colors) => {
    draw(renderTopLanguages(langs, { theme }));

    expect(cssValue('.header', 'fill')).toBe(`#${colors.title_color}`);
    expect(cssValue('.lang-name', 'fill')).toBe(`#${colors.text_color}`);
    expect([`#${colors.bg_color}`, 'url(#gradient)']).toContain(
      screen.queryByTestId('card-bg')?.getAttribute('fill'),
    );
  });

  it('should render with layout compact', () => {
    draw(renderTopLanguages(langs, { layout: 'compact' }));

    expect(screen.queryByTestId('header')).toHaveTextContent(exactly('Most Used Languages'));
    expectLabels(SLICES.map(({ label }) => label));

    const progresses = screen.queryAllByTestId('lang-progress');
    expect(progresses[0]).toHaveAttribute('width', '100');
    expect(progresses[1]).toHaveAttribute('width', '100');
    expect(progresses[2]).toHaveAttribute('width', '50');
  });

  it.each([
    { layout: 'compact', hide_values: false, card_width: undefined, width: 400 },
    { layout: 'compact', hide_values: true, card_width: undefined, width: 400 },
    { layout: 'compact', hide_values: false, card_width: 320, width: 335 },
    { layout: 'compact', hide_values: false, card_width: 450, width: 450 },
    { layout: 'pie', hide_values: false, card_width: undefined, width: 400 },
    { layout: 'pie', hide_values: false, card_width: 320, width: 335 },
    { layout: 'donut-vertical', hide_values: false, card_width: undefined, width: 400 },
    { layout: 'donut-vertical', hide_values: true, card_width: undefined, width: 400 },
    { layout: 'donut-vertical', hide_values: false, card_width: 320, width: 335 },
  ] as const)(
    'should fit a long name in the $layout second column (hide_values $hide_values, card_width $card_width)',
    ({ layout, hide_values, card_width, width }) => {
      const card = draw(renderTopLanguages(withJupyter, { layout, hide_values, card_width }));

      const text = hide_values ? 'Jupyter Notebook' : 'Jupyter Notebook 9.09%';
      const label = screen.getByText(exactly(text));
      expect(card).toHaveAttribute('width', String(width));
      expect(xOf(label) + measureText(text, 11)).toBeLessThanOrEqual(width - 25);
    },
  );

  it('should render with layout donut', () => {
    draw(renderTopLanguages(langs, { layout: 'donut' }));

    expect(screen.queryByTestId('header')).toHaveTextContent(exactly('Most Used Languages'));
    expectLabels(SLICES.map(({ label }) => label));

    const slices = screen.queryAllByTestId('lang-donut');
    // The first slice ends at twelve o'clock, straight above the centre.
    const d = pathNumbers(slices[0]);
    const center = { x: d[7] ?? 0, y: (d[8] ?? 0) + (d[2] ?? 0) };
    const percents = slices.map((slice) => donutPercent(slice, center));

    for (const [index, { percent }] of SLICES.entries()) {
      expect(slices[index]).toHaveAttribute('size', String(percent));
      expect(percents[index]).toBeCloseTo(percent);
    }
    expect(percents.reduce((sum, percent) => sum + percent, 0)).toBe(100);
  });

  it('should render a full donut (circle) if one language is 100%', () => {
    draw(renderTopLanguages({ HTML: langs.HTML }, { layout: 'donut' }));

    expectLabels(['HTML 100.00%']);
    const slices = screen.queryAllByTestId('lang-donut');
    expect(slices).toHaveLength(1);
    expect(slices[0]).toHaveAttribute('size', '100');
    expect(slices[0]?.tagName).toBe('circle');
  });

  it.each([
    { count: 1, card_width: undefined },
    { count: 4, card_width: undefined },
    { count: 5, card_width: undefined },
    { count: 10, card_width: undefined },
    { count: 5, card_width: 500 },
    { count: 5, card_width: MIN_CARD_WIDTH },
  ])(
    'should fit the donut inside the card for $count languages at card_width $card_width',
    ({ count, card_width }) => {
      const data: TopLangData = Object.fromEntries(
        Array.from({ length: count }, (_, index) => [
          `lang${index}`,
          { color: '#0f0', name: `lang${index}`, size: count - index, count: 1 },
        ]),
      );
      const card = draw(
        renderTopLanguages(data, { layout: 'donut', langs_count: count, card_width }),
      );

      const [ring] = screen.getAllByTestId('lang-donut');
      const d = pathNumbers(ring);
      const radius = Number(ring?.getAttribute('r') ?? d[2]);
      const outerRadius = radius + Number(ring?.getAttribute('stroke-width')) / 2;
      // A slice ends at twelve o'clock, straight above the centre.
      const centerX = Number(ring?.getAttribute('cx') ?? d[7]);
      const centerY = Number(ring?.getAttribute('cy') ?? (d[8] ?? 0) + radius);
      const listTop = translateOf(screen.getByTestId('donut-list')).y;
      const listMiddle = listTop + ((count - 1) * 32 + 13) / 2;

      // The body starts at the card's left padding and 55px down, under the title.
      expect(25 + centerX + outerRadius).toBeCloseTo(Number(card.getAttribute('width')) - 25);
      expect(centerY - outerRadius).toBeGreaterThanOrEqual(0);
      expect(55 + centerY + outerRadius).toBeLessThanOrEqual(
        Number(card.getAttribute('height')) - 18,
      );
      expect(centerY).toBeCloseTo(listMiddle);
    },
  );

  it('should render with layout donut vertical', () => {
    draw(renderTopLanguages(langs, { layout: 'donut-vertical' }));

    expect(screen.queryByTestId('header')).toHaveTextContent(exactly('Most Used Languages'));
    expectLabels(SLICES.map(({ label }) => label));

    const rings = screen.queryAllByTestId('lang-donut');
    const percents = rings.map((_, index) => ringPercent(rings, index));

    for (const [index, { percent }] of SLICES.entries()) {
      expect(rings[index]).toHaveAttribute('size', String(percent));
      expect(percents[index]).toBeCloseTo(percent);
    }
    expect(percents.reduce((sum, percent) => sum + percent, 0)).toBe(100);
  });

  it('should render a full vertical donut if one language is 100%', () => {
    draw(renderTopLanguages({ HTML: langs.HTML }, { layout: 'donut-vertical' }));

    expectLabels(['HTML 100.00%']);
    const rings = screen.queryAllByTestId('lang-donut');
    expect(rings[0]).toHaveAttribute('size', '100');
    expect(ringPercent(rings, 0)).toBeCloseTo(100);
  });

  it.each([
    { what: 'a widened card', data: withJupyter, card_width: undefined, centre: 200 },
    { what: 'a card_width', data: langs, card_width: 500, centre: 250 },
  ])('should centre the pie and the vertical donut on $what', ({ data, card_width, centre }) => {
    draw(renderTopLanguages(data, { layout: 'donut-vertical', card_width }));
    expect(screen.getAllByTestId('lang-donut')[0]).toHaveAttribute('cx', String(centre));

    draw(renderTopLanguages(data, { layout: 'pie', card_width }));
    expect(pathNumbers(screen.getAllByTestId('lang-pie')[0])[0]).toBe(centre);
  });

  it('should centre a single-language pie on a card_width', () => {
    document.body.innerHTML = renderTopLanguages(
      { HTML: langs.HTML },
      { layout: 'pie', card_width: 500 },
    );
    expect(screen.getByTestId('lang-pie')).toHaveAttribute('cx', '250');
  });

  it('should render with layout pie', () => {
    draw(renderTopLanguages(langs, { layout: 'pie' }));

    expect(screen.queryByTestId('header')).toHaveTextContent(exactly('Most Used Languages'));
    expectLabels(SLICES.map(({ label }) => label));

    const slices = screen.queryAllByTestId('lang-pie');
    const d = pathNumbers(slices[0]);
    const center = { x: d[0] ?? 0, y: d[1] ?? 0 };
    const percents = slices.map((slice) => piePercent(slice, center));

    for (const [index, { percent }] of SLICES.entries()) {
      expect(slices[index]).toHaveAttribute('size', String(percent));
      expect(percents[index]).toBeCloseTo(percent);
    }
    expect(percents.reduce((sum, percent) => sum + percent, 0)).toBe(100);
  });

  it.each([false, true])(
    'should render a full pie (circle) for a single language (hide_values %s)',
    (hide_values) => {
      draw(renderTopLanguages({ HTML: langs.HTML }, { layout: 'pie', hide_values }));

      expectLabels([hide_values ? 'HTML' : 'HTML 100.00%']);
      const slices = screen.queryAllByTestId('lang-pie');
      expect(slices).toHaveLength(1);
      expect(slices[0]).toHaveAttribute('size', '100');
      expect(slices[0]?.tagName).toBe('circle');
    },
  );

  it('should render a translated title', () => {
    draw(renderTopLanguages(langs, { locale: 'cn' }));
    expect(document.querySelector('.header')).toHaveTextContent(exactly('最常用的语言'));
  });

  it('should render without rounding', () => {
    draw(renderTopLanguages(langs, { border_radius: 0 }));
    expect(document.querySelector('rect')).toHaveAttribute('rx', '0');
    draw(renderTopLanguages(langs));
    expect(document.querySelector('rect')).toHaveAttribute('rx', '8');
  });

  it.each([
    [{ langs_count: 1 }, ['HTML', 'Other']],
    // the count is of what is left once `hide_langs` has taken its share
    [{ hide_langs: ['HTML'], langs_count: 2 }, ['javascript', 'css']],
    [{ langs_count: 2, locale: 'it' }, ['HTML', 'javascript', 'Other']],
  ])('should render langs with specified langs_count (%o)', (options, names) => {
    draw(renderTopLanguages(langs, options));
    const drawn = screen.queryAllByTestId('lang-name');
    expect(drawn).toHaveLength(names.length);
    for (const [index, name] of names.entries()) {
      expect(drawn[index]).toHaveTextContent(exactly(name));
    }
  });

  it('should keep each share a share of every language, Other included', () => {
    draw(renderTopLanguages(langs, { langs_count: 2, layout: 'compact' }));
    expectLabels(['HTML 40.00%', 'javascript 40.00%', 'Other 20.00%']);
    expect(document.querySelector('desc')).toHaveTextContent(
      exactly('HTML 40.00%, javascript 40.00%, Other 20.00%'),
    );
  });

  it('should show "No languages data." message instead of empty card when nothing to show', () => {
    draw(renderTopLanguages({}));
    expect(document.querySelector('.stat')).toHaveTextContent(exactly('No languages data.'));
  });

  it.each([
    ['percent', ['HTML 40.00%', 'javascript 40.00%', 'css 20.00%']],
    ['bytes', ['HTML 200.0 B', 'javascript 200.0 B', 'css 100.0 B']],
  ] as const)('should show values as %s', (value_format, labels) => {
    draw(renderTopLanguages(langs, { layout: 'compact', value_format }));
    expectLabels([...labels]);
  });

  it.each([
    { hide_progress: false, width: '400' },
    { hide_progress: true, width: '300' },
  ])(
    'should measure the compact list without its values when hide_progress is $hide_progress',
    ({ hide_progress, width }) => {
      const data = {
        ...langs,
        powershell: { color: '#012456', name: 'PowerShell', size: 50, count: 1 },
      } satisfies TopLangData;

      const card = draw(renderTopLanguages(data, { layout: 'compact', hide_progress }));

      expect(card).toHaveAttribute('width', width);
    },
  );

  it.each(renderTopLanguages.OPTIONS.layout)(
    'should hide stats values when hide_values is true (%s layout)',
    (layout) => {
      draw(renderTopLanguages(langs, { layout, hide_values: true }));

      expectLabels(['HTML', 'javascript', 'css']);
    },
  );

  it('should still size the pie slices when hide_values is true', () => {
    draw(renderTopLanguages(langs, { layout: 'pie', hide_values: true }));
    expect(screen.queryAllByTestId('lang-pie')[0]).toHaveAttribute('size', '40');
  });
});

describe('test renderTopLanguages with languages missing a color', () => {
  // GitHub's GraphQL `Language.color` is nullable, so a language can reach the
  // card with `color: null`. It must fall back to the default color instead of
  // throwing.
  const langsWithNullColor = {
    HTML: { color: '#0f0', name: 'HTML', size: 200, count: 1 },
    Text: { color: null, name: 'Text', size: 100, count: 1 },
  } satisfies TopLangData;

  it.each(renderTopLanguages.OPTIONS.layout)(
    'should render the %s layout using the default color',
    (layout) => {
      expect(renderTopLanguages(langsWithNullColor, { layout })).toContain('#858585');
    },
  );
});
