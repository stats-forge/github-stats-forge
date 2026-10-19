import { screen } from '@testing-library/dom';
import { cssToObject } from '@uppercod/css-to-object';
import { describe, expect, it } from 'vitest';

import { topLangs as topLangsApi } from '../src/api/top-langs.ts';
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
import type { TopLangData } from '../src/fetchers/types.ts';
import { themes } from '../src/themes/index.ts';

import { testConfig } from './_config.ts';
import { approxNumber } from './utils.ts';

const langs = {
  HTML: { color: '#0f0', name: 'HTML', size: 200, count: 1 },
  javascript: { color: '#0ff', name: 'javascript', size: 200, count: 1 },
  css: { color: '#ff0', name: 'css', size: 100, count: 1 },
} satisfies TopLangData;

/**
 * Retrieve number array from SVG path definition string.
 *
 * @returns Resulting numbers array.
 */
const getNumbersFromSvgPathDefinitionAttribute = (d: string): Array<number> =>
  d
    .split(' ')
    .filter((x) => !Number.isNaN(Number(x)))
    .map((x) => Number.parseFloat(x));

/**
 * Retrieve the language percentage from the donut chart SVG.
 *
 * @returns The percentage of the language.
 */
const langPercentFromDonutLayoutSvg = (d: string, centerX: number, centerY: number): number => {
  const dTmp = getNumbersFromSvgPathDefinitionAttribute(d);
  const endAngle =
    cartesianToPolar(centerX, centerY, dTmp[0] ?? 0, dTmp[1] ?? 0).angleInDegrees + 90;
  let startAngle =
    cartesianToPolar(centerX, centerY, dTmp[7] ?? 0, dTmp[8] ?? 0).angleInDegrees + 90;
  if (startAngle > endAngle) {
    startAngle -= 360;
  }
  return (endAngle - startAngle) / 3.6;
};

/**
 * Calculate language percentage for donut vertical chart SVG.
 *
 * @returns Chart part percentage.
 */
const langPercentFromDonutVerticalLayoutSvg = (
  partLength: number,
  totalCircleLength: number,
): number => (partLength / totalCircleLength) * 100;

/**
 * Retrieve the language percentage from the pie chart SVG.
 *
 * @returns The percentage of the language.
 */
const langPercentFromPieLayoutSvg = (d: string, centerX: number, centerY: number): number => {
  const dTmp = getNumbersFromSvgPathDefinitionAttribute(d);
  const startAngle = cartesianToPolar(centerX, centerY, dTmp[2] ?? 0, dTmp[3] ?? 0).angleInDegrees;
  const endAngle = cartesianToPolar(centerX, centerY, dTmp[9] ?? 0, dTmp[10] ?? 0).angleInDegrees;
  return ((endAngle - startAngle) / 360) * 100;
};

describe('Test renderTopLanguages helper functions', () => {
  it('degreesToRadians', () => {
    expect(degreesToRadians(0)).toBeCloseTo(0);
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
    expect(degreesToRadians(270)).toBeCloseTo((3 * Math.PI) / 2);
    expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI);
  });

  it('radiansToDegrees', () => {
    expect(radiansToDegrees(0)).toBeCloseTo(0);
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
    expect(radiansToDegrees((3 * Math.PI) / 2)).toBeCloseTo(270);
    expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360);
  });

  it('polarToCartesian', () => {
    expect(polarToCartesian(100, 100, 60, 0)).toStrictEqual({
      x: approxNumber(160),
      y: approxNumber(100),
    });
    expect(polarToCartesian(100, 100, 60, 45)).toStrictEqual({
      x: approxNumber(142.42640687119285),
      y: approxNumber(142.42640687119285),
    });
    expect(polarToCartesian(100, 100, 60, 90)).toStrictEqual({
      x: approxNumber(100),
      y: approxNumber(160),
    });
    expect(polarToCartesian(100, 100, 60, 135)).toStrictEqual({
      x: approxNumber(57.573593128807154),
      y: approxNumber(142.42640687119285),
    });
    expect(polarToCartesian(100, 100, 60, 180)).toStrictEqual({
      x: approxNumber(40),
      y: approxNumber(100),
    });
    expect(polarToCartesian(100, 100, 60, 225)).toStrictEqual({
      x: approxNumber(57.57359312880714),
      y: approxNumber(57.573593128807154),
    });
    expect(polarToCartesian(100, 100, 60, 270)).toStrictEqual({
      x: approxNumber(100),
      y: approxNumber(40),
    });
    expect(polarToCartesian(100, 100, 60, 315)).toStrictEqual({
      x: approxNumber(142.42640687119285),
      y: approxNumber(57.57359312880714),
    });
    expect(polarToCartesian(100, 100, 60, 360)).toStrictEqual({
      x: approxNumber(160),
      y: approxNumber(100),
    });
  });

  it('cartesianToPolar', () => {
    expect(cartesianToPolar(100, 100, 160, 100)).toStrictEqual({
      radius: approxNumber(60),
      angleInDegrees: approxNumber(0),
    });
    expect(cartesianToPolar(100, 100, 142.42640687119285, 142.42640687119285)).toStrictEqual({
      radius: approxNumber(60),
      angleInDegrees: approxNumber(45),
    });
    expect(cartesianToPolar(100, 100, 100, 160)).toStrictEqual({
      radius: approxNumber(60),
      angleInDegrees: approxNumber(90),
    });
    expect(cartesianToPolar(100, 100, 57.573593128807154, 142.42640687119285)).toStrictEqual({
      radius: approxNumber(60),
      angleInDegrees: approxNumber(135),
    });
    expect(cartesianToPolar(100, 100, 40, 100.00000000000001)).toStrictEqual({
      radius: approxNumber(60),
      angleInDegrees: approxNumber(180),
    });
    expect(cartesianToPolar(100, 100, 57.57359312880714, 57.573593128807154)).toStrictEqual({
      radius: approxNumber(60),
      angleInDegrees: approxNumber(225),
    });
    expect(cartesianToPolar(100, 100, 99.99999999999999, 40)).toStrictEqual({
      radius: approxNumber(60),
      angleInDegrees: approxNumber(270),
    });
    expect(cartesianToPolar(100, 100, 142.42640687119285, 57.57359312880714)).toStrictEqual({
      radius: approxNumber(60),
      angleInDegrees: approxNumber(315),
    });
    expect(cartesianToPolar(100, 100, 160, 99.99999999999999)).toStrictEqual({
      radius: approxNumber(60),
      angleInDegrees: approxNumber(360),
    });
  });

  it('calculateCompactLayoutHeight', () => {
    expect(calculateCompactLayoutHeight(0)).toBe(86);
    expect(calculateCompactLayoutHeight(1)).toBe(111);
    expect(calculateCompactLayoutHeight(2)).toBe(111);
    expect(calculateCompactLayoutHeight(3)).toBe(136);
    expect(calculateCompactLayoutHeight(4)).toBe(136);
    expect(calculateCompactLayoutHeight(5)).toBe(161);
    expect(calculateCompactLayoutHeight(6)).toBe(161);
    expect(calculateCompactLayoutHeight(7)).toBe(186);
    expect(calculateCompactLayoutHeight(8)).toBe(186);
    expect(calculateCompactLayoutHeight(9)).toBe(211);
    expect(calculateCompactLayoutHeight(10)).toBe(211);
  });

  it('calculateNormalLayoutHeight', () => {
    expect(calculateNormalLayoutHeight(0)).toBe(110);
    expect(calculateNormalLayoutHeight(1)).toBe(110);
    expect(calculateNormalLayoutHeight(2)).toBe(150);
    expect(calculateNormalLayoutHeight(3)).toBe(190);
    expect(calculateNormalLayoutHeight(4)).toBe(230);
    expect(calculateNormalLayoutHeight(5)).toBe(270);
    expect(calculateNormalLayoutHeight(6)).toBe(310);
    expect(calculateNormalLayoutHeight(7)).toBe(350);
    expect(calculateNormalLayoutHeight(8)).toBe(390);
    expect(calculateNormalLayoutHeight(9)).toBe(430);
    expect(calculateNormalLayoutHeight(10)).toBe(470);
  });

  it('calculateDonutLayoutHeight', () => {
    expect(calculateDonutLayoutHeight(0)).toBe(205);
    expect(calculateDonutLayoutHeight(1)).toBe(205);
    expect(calculateDonutLayoutHeight(2)).toBe(205);
    expect(calculateDonutLayoutHeight(3)).toBe(205);
    expect(calculateDonutLayoutHeight(4)).toBe(205);
    expect(calculateDonutLayoutHeight(5)).toBe(214);
    expect(calculateDonutLayoutHeight(6)).toBe(246);
    expect(calculateDonutLayoutHeight(7)).toBe(278);
    expect(calculateDonutLayoutHeight(8)).toBe(310);
    expect(calculateDonutLayoutHeight(9)).toBe(342);
    expect(calculateDonutLayoutHeight(10)).toBe(374);
  });

  it('calculateDonutVerticalLayoutHeight', () => {
    expect(calculateDonutVerticalLayoutHeight(0)).toBe(300);
    expect(calculateDonutVerticalLayoutHeight(1)).toBe(325);
    expect(calculateDonutVerticalLayoutHeight(2)).toBe(325);
    expect(calculateDonutVerticalLayoutHeight(3)).toBe(350);
    expect(calculateDonutVerticalLayoutHeight(4)).toBe(350);
    expect(calculateDonutVerticalLayoutHeight(5)).toBe(375);
    expect(calculateDonutVerticalLayoutHeight(6)).toBe(375);
    expect(calculateDonutVerticalLayoutHeight(7)).toBe(400);
    expect(calculateDonutVerticalLayoutHeight(8)).toBe(400);
    expect(calculateDonutVerticalLayoutHeight(9)).toBe(425);
    expect(calculateDonutVerticalLayoutHeight(10)).toBe(425);
  });

  it('calculatePieLayoutHeight', () => {
    expect(calculatePieLayoutHeight(0)).toBe(300);
    expect(calculatePieLayoutHeight(1)).toBe(325);
    expect(calculatePieLayoutHeight(2)).toBe(325);
    expect(calculatePieLayoutHeight(3)).toBe(350);
    expect(calculatePieLayoutHeight(4)).toBe(350);
    expect(calculatePieLayoutHeight(5)).toBe(375);
    expect(calculatePieLayoutHeight(6)).toBe(375);
    expect(calculatePieLayoutHeight(7)).toBe(400);
    expect(calculatePieLayoutHeight(8)).toBe(400);
    expect(calculatePieLayoutHeight(9)).toBe(425);
    expect(calculatePieLayoutHeight(10)).toBe(425);
  });

  it('getCircleLength', () => {
    expect(getCircleLength(20)).toBeCloseTo(125.663);
    expect(getCircleLength(30)).toBeCloseTo(188.495);
    expect(getCircleLength(40)).toBeCloseTo(251.327);
    expect(getCircleLength(50)).toBeCloseTo(314.159);
    expect(getCircleLength(60)).toBeCloseTo(376.991);
    expect(getCircleLength(70)).toBeCloseTo(439.822);
    expect(getCircleLength(80)).toBeCloseTo(502.654);
    expect(getCircleLength(90)).toBeCloseTo(565.486);
    expect(getCircleLength(100)).toBeCloseTo(628.318);
  });

  it('trimTopLanguages', () => {
    expect(trimTopLanguages({}, 5)).toStrictEqual({
      langs: [],
      totalLanguageSize: 0,
    });
    expect(trimTopLanguages({ javascript: langs.javascript }, 5)).toStrictEqual({
      langs: [langs.javascript],
      totalLanguageSize: 200,
    });
    expect(trimTopLanguages({ javascript: langs.javascript, HTML: langs.HTML }, 5)).toStrictEqual({
      langs: [langs.javascript, langs.HTML],
      totalLanguageSize: 400,
    });
    expect(trimTopLanguages(langs, 5)).toStrictEqual({
      langs: Object.values(langs),
      totalLanguageSize: 500,
    });
    expect(trimTopLanguages(langs, 2)).toStrictEqual({
      langs: Object.values(langs).slice(0, 2),
      totalLanguageSize: 400,
    });
    expect(trimTopLanguages(langs, 5, ['javascript'])).toStrictEqual({
      langs: [langs.HTML, langs.css],
      totalLanguageSize: 300,
    });
  });

  it('getDefaultLanguagesCountByLayout', () => {
    expect(getDefaultLanguagesCountByLayout({ layout: 'normal' })).toBe(5);
    expect(getDefaultLanguagesCountByLayout({})).toBe(5);
    expect(getDefaultLanguagesCountByLayout({ layout: 'compact' })).toBe(6);
    expect(getDefaultLanguagesCountByLayout({ hide_progress: true })).toBe(6);
    expect(getDefaultLanguagesCountByLayout({ layout: 'donut' })).toBe(5);
    expect(getDefaultLanguagesCountByLayout({ layout: 'donut-vertical' })).toBe(6);
    expect(getDefaultLanguagesCountByLayout({ layout: 'pie' })).toBe(6);
  });
});

describe('Test renderTopLanguages', () => {
  it('should render correctly', () => {
    document.body.innerHTML = renderTopLanguages(langs);

    expect(screen.queryByTestId('header')).toHaveTextContent('Most Used Languages');

    const langNames = screen.queryAllByTestId('lang-name');
    expect(langNames[0]).toHaveTextContent('HTML');
    expect(langNames[1]).toHaveTextContent('javascript');
    expect(langNames[2]).toHaveTextContent('css');

    const progresses = screen.queryAllByTestId('lang-progress');
    expect(progresses[0]).toHaveAttribute('width', '40%');
    expect(progresses[1]).toHaveAttribute('width', '40%');
    expect(progresses[2]).toHaveAttribute('width', '20%');
  });

  it('should hide languages when hide is passed', () => {
    document.body.innerHTML = renderTopLanguages(langs, {
      hide_langs: ['HTML'],
    });
    let langNames = screen.queryAllByTestId('lang-name');
    expect(langNames[0]).toBeInTheDocument();
    expect(langNames[1]).toBeInTheDocument();
    expect(langNames).toHaveLength(2);

    // multiple languages passed
    document.body.innerHTML = renderTopLanguages(langs, {
      hide_langs: ['HTML', 'css'],
    });
    langNames = screen.queryAllByTestId('lang-name');
    expect(langNames[0]).toBeInTheDocument();
    expect(langNames).toHaveLength(1);
  });

  it('should resize the height correctly depending on langs', () => {
    document.body.innerHTML = renderTopLanguages(langs, {});
    expect(document.querySelector('svg')).toHaveAttribute('height', '190');

    document.body.innerHTML = renderTopLanguages(
      {
        ...langs,
        python: {
          color: '#ff0',
          name: 'python',
          size: 100,
          count: 1,
        },
      },
      {},
    );
    expect(document.querySelector('svg')).toHaveAttribute('height', '230');
  });

  it('should render with custom width set', () => {
    document.body.innerHTML = renderTopLanguages(langs, {});

    expect(document.querySelector('svg')).toHaveAttribute('width', '300');

    document.body.innerHTML = renderTopLanguages(langs, { card_width: 400 });
    expect(document.querySelector('svg')).toHaveAttribute('width', '400');
  });

  it('should render with min width', () => {
    document.body.innerHTML = renderTopLanguages(langs, { card_width: 190 });

    expect(document.querySelector('svg')).toHaveAttribute('width', MIN_CARD_WIDTH.toString());

    document.body.innerHTML = renderTopLanguages(langs, { card_width: 100 });
    expect(document.querySelector('svg')).toHaveAttribute('width', MIN_CARD_WIDTH.toString());
  });

  it('should render default colors properly', () => {
    document.body.innerHTML = renderTopLanguages(langs);

    const styleTag = document.querySelector('style');
    const stylesObject = cssToObject(styleTag?.textContent ?? '');

    const host = stylesObject[':host'];
    const headerStyles = host?.['.header '];
    const langNameStyles = host?.['.lang-name '];

    expect(headerStyles?.['fill']?.trim()).toBe('#2f80ed');
    expect(langNameStyles?.['fill']?.trim()).toBe('#434d58');
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', '#fffefe');
  });

  it('should render custom colors properly', () => {
    const customColors = {
      title_color: '5a0',
      icon_color: '1b998b',
      text_color: '9991',
      bg_color: '252525',
      prog_bar_bg_color: '444',
    };

    document.body.innerHTML = renderTopLanguages(langs, { ...customColors });

    const styleTag = document.querySelector('style');
    const stylesObject = cssToObject(styleTag?.innerHTML ?? '');

    const host = stylesObject[':host'];
    const headerStyles = host?.['.header '];
    const langNameStyles = host?.['.lang-name '];
    const progressBgStyles = host?.['.progress-background '];

    const { title_color, text_color, prog_bar_bg_color } = customColors;

    expect(headerStyles?.['fill']?.trim()).toBe(`#${title_color}`);
    expect(langNameStyles?.['fill']?.trim()).toBe(`#${text_color}`);
    expect(progressBgStyles?.['fill']?.trim()).toBe(`#${prog_bar_bg_color}`);
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', '#252525');

    expect(screen.queryAllByTestId('progress-background').length).toBeGreaterThan(0);
  });

  it('should render custom colors with themes', () => {
    document.body.innerHTML = renderTopLanguages(langs, {
      title_color: '5a0',
      theme: 'radical',
    });

    const styleTag = document.querySelector('style');
    const stylesObject = cssToObject(styleTag?.innerHTML ?? '');

    const host = stylesObject[':host'];
    const headerStyles = host?.['.header '];
    const langNameStyles = host?.['.lang-name '];

    expect(headerStyles?.['fill']?.trim()).toBe('#5a0');
    expect(langNameStyles?.['fill']?.trim()).toBe(`#${themes.radical.text_color}`);
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', `#${themes.radical.bg_color}`);
  });

  it('should render with all the themes', () => {
    for (const [name, themeData] of Object.entries(themes)) {
      document.body.innerHTML = renderTopLanguages(langs, {
        theme: name,
      });

      const styleTag = document.querySelector('style');
      const stylesObject = cssToObject(styleTag?.innerHTML ?? '');

      const host = stylesObject[':host'];
      const headerStyles = host?.['.header '];
      const langNameStyles = host?.['.lang-name '];

      expect(headerStyles?.['fill']?.trim()).toBe(`#${themeData.title_color}`);
      expect(langNameStyles?.['fill']?.trim()).toBe(`#${themeData.text_color}`);
      const backgroundElement = screen.queryByTestId('card-bg');
      const backgroundElementFill = backgroundElement?.getAttribute('fill');
      expect([`#${themeData.bg_color}`, 'url(#gradient)']).toContain(backgroundElementFill);
    }
  });

  it('should render with layout compact', () => {
    document.body.innerHTML = renderTopLanguages(langs, { layout: 'compact' });

    expect(screen.queryByTestId('header')).toHaveTextContent('Most Used Languages');

    const langNames = screen.queryAllByTestId('lang-name');
    const progresses = screen.queryAllByTestId('lang-progress');

    expect(langNames[0]).toHaveTextContent('HTML 40.00%');
    expect(progresses[0]).toHaveAttribute('width', '100');

    expect(langNames[1]).toHaveTextContent('javascript 40.00%');
    expect(progresses[1]).toHaveAttribute('width', '100');

    expect(langNames[2]).toHaveTextContent('css 20.00%');
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
      const data = {
        ...langs,
        jupyter: { color: '#f80', name: 'Jupyter Notebook', size: 50, count: 1 },
      } satisfies TopLangData;
      document.body.innerHTML = renderTopLanguages(data, { layout, hide_values, card_width });

      // The list starts at the card's left padding; the second column at its own offset.
      const card = document.querySelector('svg');
      const columnOffset = Number(
        /translate\((?<x>[\d.]+), 0\)/u.exec(screen.getByTestId('lang-items').innerHTML)?.groups?.[
          'x'
        ],
      );
      const label = hide_values ? 'Jupyter Notebook' : 'Jupyter Notebook 9.09%';
      expect(screen.getAllByTestId('lang-name')[3]).toHaveTextContent(label);
      expect(card).toHaveAttribute('width', String(width));
      expect(25 + columnOffset + 15 + measureText(label, 11)).toBeLessThanOrEqual(width - 25);
    },
  );

  it('should render with layout donut', () => {
    document.body.innerHTML = renderTopLanguages(langs, { layout: 'donut' });

    expect(screen.queryByTestId('header')).toHaveTextContent('Most Used Languages');

    const langNames = screen.queryAllByTestId('lang-name');
    const donuts = screen.queryAllByTestId('lang-donut');

    expect(langNames[0]).toHaveTextContent('HTML 40.00%');
    expect(donuts[0]).toHaveAttribute('size', '40');
    // The first slice ends at twelve o'clock, straight above the centre.
    const d = getNumbersFromSvgPathDefinitionAttribute(donuts[0]?.getAttribute('d') ?? '');
    const center = { x: d[7] ?? 0, y: (d[8] ?? 0) + (d[2] ?? 0) };
    const HTMLLangPercent = langPercentFromDonutLayoutSvg(
      donuts[0]?.getAttribute('d') ?? '',
      center.x,
      center.y,
    );
    expect(HTMLLangPercent).toBeCloseTo(40);

    expect(langNames[1]).toHaveTextContent('javascript 40.00%');
    expect(donuts[1]).toHaveAttribute('size', '40');
    const javascriptLangPercent = langPercentFromDonutLayoutSvg(
      donuts[1]?.getAttribute('d') ?? '',
      center.x,
      center.y,
    );
    expect(javascriptLangPercent).toBeCloseTo(40);

    expect(langNames[2]).toHaveTextContent('css 20.00%');
    expect(donuts[2]).toHaveAttribute('size', '20');
    const cssLangPercent = langPercentFromDonutLayoutSvg(
      donuts[2]?.getAttribute('d') ?? '',
      center.x,
      center.y,
    );
    expect(cssLangPercent).toBeCloseTo(20);

    expect(HTMLLangPercent + javascriptLangPercent + cssLangPercent).toBe(100);

    // Should render full donut (circle) if one language is 100%.
    document.body.innerHTML = renderTopLanguages({ HTML: langs.HTML }, { layout: 'donut' });
    const singleDonuts = screen.queryAllByTestId('lang-donut');
    expect(screen.queryAllByTestId('lang-name')[0]).toHaveTextContent('HTML 100.00%');
    expect(singleDonuts[0]).toHaveAttribute('size', '100');
    expect(singleDonuts).toHaveLength(1);
    expect(singleDonuts[0]?.tagName).toBe('circle');
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
      document.body.innerHTML = renderTopLanguages(data, {
        layout: 'donut',
        langs_count: count,
        card_width,
      });

      const card = document.querySelector('svg');
      const [ring] = screen.getAllByTestId('lang-donut');
      const d = getNumbersFromSvgPathDefinitionAttribute(ring?.getAttribute('d') ?? '');
      const radius = Number(ring?.getAttribute('r') ?? d[2]);
      const outerRadius = radius + Number(ring?.getAttribute('stroke-width')) / 2;
      // A slice ends at twelve o'clock, straight above the centre.
      const centerX = Number(ring?.getAttribute('cx') ?? d[7]);
      const centerY = Number(ring?.getAttribute('cy') ?? (d[8] ?? 0) + radius);
      const listOffsetY = Number(
        /translate\(0, (?<y>[\d.]+)\)/u.exec(
          screen.getByTestId('donut-list').getAttribute('transform') ?? '',
        )?.groups?.['y'],
      );
      const listMiddle = listOffsetY + ((count - 1) * 32 + 13) / 2;

      // The body starts at the card's left padding and 55px down, under the title.
      expect(25 + centerX + outerRadius).toBeCloseTo(Number(card?.getAttribute('width')) - 25);
      expect(centerY - outerRadius).toBeGreaterThanOrEqual(0);
      expect(55 + centerY + outerRadius).toBeLessThanOrEqual(
        Number(card?.getAttribute('height')) - 18,
      );
      expect(centerY).toBeCloseTo(listMiddle);
    },
  );

  it('should render with layout donut vertical', () => {
    document.body.innerHTML = renderTopLanguages(langs, {
      layout: 'donut-vertical',
    });

    expect(screen.queryByTestId('header')).toHaveTextContent('Most Used Languages');

    const langNames = screen.queryAllByTestId('lang-name');
    const donuts = screen.queryAllByTestId('lang-donut');

    expect(langNames[0]).toHaveTextContent('HTML 40.00%');
    expect(donuts[0]).toHaveAttribute('size', '40');

    const totalCircleLength = Number(donuts[0]?.getAttribute('stroke-dasharray'));

    const HTMLLangPercent = langPercentFromDonutVerticalLayoutSvg(
      Number(donuts[1]?.getAttribute('stroke-dashoffset')) -
        Number(donuts[0]?.getAttribute('stroke-dashoffset')),
      totalCircleLength,
    );
    expect(HTMLLangPercent).toBeCloseTo(40);

    expect(langNames[1]).toHaveTextContent('javascript 40.00%');
    expect(donuts[1]).toHaveAttribute('size', '40');
    const javascriptLangPercent = langPercentFromDonutVerticalLayoutSvg(
      Number(donuts[2]?.getAttribute('stroke-dashoffset')) -
        Number(donuts[1]?.getAttribute('stroke-dashoffset')),
      totalCircleLength,
    );
    expect(javascriptLangPercent).toBeCloseTo(40);

    expect(langNames[2]).toHaveTextContent('css 20.00%');
    expect(donuts[2]).toHaveAttribute('size', '20');
    const cssLangPercent = langPercentFromDonutVerticalLayoutSvg(
      totalCircleLength - Number(donuts[2]?.getAttribute('stroke-dashoffset')),
      totalCircleLength,
    );
    expect(cssLangPercent).toBeCloseTo(20);

    expect(HTMLLangPercent + javascriptLangPercent + cssLangPercent).toBe(100);
  });

  it('should render with layout donut vertical full donut circle of one language is 100%', () => {
    document.body.innerHTML = renderTopLanguages(
      { HTML: langs.HTML },
      { layout: 'donut-vertical' },
    );
    const donuts = screen.queryAllByTestId('lang-donut');
    expect(screen.queryAllByTestId('lang-name')[0]).toHaveTextContent('HTML 100.00%');
    expect(donuts[0]).toHaveAttribute('size', '100');
    const totalCircleLength = Number(donuts[0]?.getAttribute('stroke-dasharray'));

    const HTMLLangPercent = langPercentFromDonutVerticalLayoutSvg(
      totalCircleLength - Number(donuts[0]?.getAttribute('stroke-dashoffset')),
      totalCircleLength,
    );
    expect(HTMLLangPercent).toBeCloseTo(100);
  });

  const withLongName = {
    ...langs,
    jupyter: { color: '#f80', name: 'Jupyter Notebook', size: 50, count: 1 },
  } satisfies TopLangData;

  it.each([
    { what: 'a widened card', data: withLongName, card_width: undefined, centre: 200 },
    { what: 'a card_width', data: langs, card_width: 500, centre: 250 },
  ])('should centre the pie and the vertical donut on $what', ({ data, card_width, centre }) => {
    document.body.innerHTML = renderTopLanguages(data, { layout: 'donut-vertical', card_width });
    expect(screen.getAllByTestId('lang-donut')[0]).toHaveAttribute('cx', String(centre));

    document.body.innerHTML = renderTopLanguages(data, { layout: 'pie', card_width });
    const d = getNumbersFromSvgPathDefinitionAttribute(
      screen.getAllByTestId('lang-pie')[0]?.getAttribute('d') ?? '',
    );
    expect(d[0]).toBe(centre);
  });

  it('should centre a single-language pie on a card_width', () => {
    document.body.innerHTML = renderTopLanguages(
      { HTML: langs.HTML },
      { layout: 'pie', card_width: 500 },
    );
    expect(screen.getByTestId('lang-pie')).toHaveAttribute('cx', '250');
  });

  it('should render with layout pie', () => {
    document.body.innerHTML = renderTopLanguages(langs, { layout: 'pie' });

    expect(screen.queryByTestId('header')).toHaveTextContent('Most Used Languages');

    const langNames = screen.queryAllByTestId('lang-name');
    const pies = screen.queryAllByTestId('lang-pie');

    expect(langNames[0]).toHaveTextContent('HTML 40.00%');
    expect(pies[0]).toHaveAttribute('size', '40');

    const d = getNumbersFromSvgPathDefinitionAttribute(pies[0]?.getAttribute('d') ?? '');
    const center = { x: d[0] ?? 0, y: d[1] ?? 0 };
    const HTMLLangPercent = langPercentFromPieLayoutSvg(
      pies[0]?.getAttribute('d') ?? '',
      center.x,
      center.y,
    );
    expect(HTMLLangPercent).toBeCloseTo(40);

    expect(langNames[1]).toHaveTextContent('javascript 40.00%');
    expect(pies[1]).toHaveAttribute('size', '40');
    const javascriptLangPercent = langPercentFromPieLayoutSvg(
      pies[1]?.getAttribute('d') ?? '',
      center.x,
      center.y,
    );
    expect(javascriptLangPercent).toBeCloseTo(40);

    expect(langNames[2]).toHaveTextContent('css 20.00%');
    expect(pies[2]).toHaveAttribute('size', '20');
    const cssLangPercent = langPercentFromPieLayoutSvg(
      pies[2]?.getAttribute('d') ?? '',
      center.x,
      center.y,
    );
    expect(cssLangPercent).toBeCloseTo(20);

    expect(HTMLLangPercent + javascriptLangPercent + cssLangPercent).toBe(100);

    // Should render full pie (circle) if one language is 100%.
    document.body.innerHTML = renderTopLanguages({ HTML: langs.HTML }, { layout: 'pie' });
    const singlePies = screen.queryAllByTestId('lang-pie');
    expect(screen.queryAllByTestId('lang-name')[0]).toHaveTextContent('HTML 100.00%');
    expect(singlePies[0]).toHaveAttribute('size', '100');
    expect(singlePies).toHaveLength(1);
    expect(singlePies[0]?.tagName).toBe('circle');
  });

  it('should render a translated title', () => {
    document.body.innerHTML = renderTopLanguages(langs, { locale: 'cn' });
    expect(document.querySelector('.header')).toHaveTextContent('最常用的语言');
  });

  it('should render without rounding', () => {
    document.body.innerHTML = renderTopLanguages(langs, { border_radius: 0 });
    expect(document.querySelector('rect')).toHaveAttribute('rx', '0');
    document.body.innerHTML = renderTopLanguages(langs, {});
    expect(document.querySelector('rect')).toHaveAttribute('rx', '8');
  });

  it('should render langs with specified langs_count', () => {
    const options = {
      langs_count: 1,
    };
    document.body.innerHTML = renderTopLanguages(langs, { ...options });
    expect(screen.queryAllByTestId('lang-name')).toHaveLength(options.langs_count);
  });

  it('should render langs with specified langs_count even when hide is set', () => {
    const options = {
      hide_langs: ['HTML'],
      langs_count: 2,
    };
    document.body.innerHTML = renderTopLanguages(langs, { ...options });
    expect(screen.queryAllByTestId('lang-name')).toHaveLength(options.langs_count);
  });

  it('should show "No languages data." message instead of empty card when nothing to show', () => {
    document.body.innerHTML = renderTopLanguages({});
    expect(document.querySelector('.stat')).toHaveTextContent('No languages data.');
  });

  it('should show proper stats format', () => {
    document.body.innerHTML = renderTopLanguages(langs, {
      layout: 'compact',
      value_format: 'percent',
    });

    let langNames = screen.queryAllByTestId('lang-name');
    expect(langNames[0]).toHaveTextContent('HTML 40.00%');
    expect(langNames[1]).toHaveTextContent('javascript 40.00%');
    expect(langNames[2]).toHaveTextContent('css 20.00%');

    document.body.innerHTML = renderTopLanguages(langs, {
      layout: 'compact',
      value_format: 'bytes',
    });

    langNames = screen.queryAllByTestId('lang-name');
    expect(langNames[0]).toHaveTextContent('HTML 200.0 B');
    expect(langNames[1]).toHaveTextContent('javascript 200.0 B');
    expect(langNames[2]).toHaveTextContent('css 100.0 B');
  });

  it('should hide stats values when hide_values is true (compact layout)', () => {
    document.body.innerHTML = renderTopLanguages(langs, {
      layout: 'compact',
      hide_values: true,
    });

    // a label matches by substring, so it is the list as a whole that must carry no value
    expect(screen.getByTestId('lang-items')).not.toHaveTextContent('%');
    const langNames = screen.queryAllByTestId('lang-name');
    expect(langNames[0]).toHaveTextContent('HTML');
    expect(langNames[1]).toHaveTextContent('javascript');
  });

  it('should hide stats values when hide_values is true (normal layout)', () => {
    document.body.innerHTML = renderTopLanguages(langs, {
      hide_values: true,
    });

    // a label matches by substring, so it is the list as a whole that must carry no value
    expect(screen.getByTestId('lang-items')).not.toHaveTextContent('%');
    const langNames = screen.queryAllByTestId('lang-name');
    expect(langNames[0]).toHaveTextContent('HTML');
    expect(langNames).toHaveLength(3);
  });

  it('should hide stats values when hide_values is true (donut layout)', () => {
    document.body.innerHTML = renderTopLanguages(langs, {
      layout: 'donut',
      hide_values: true,
    });

    // a label matches by substring, so it is the list as a whole that must carry no value
    expect(screen.getByTestId('lang-items')).not.toHaveTextContent('%');
    const langNames = screen.queryAllByTestId('lang-name');
    expect(langNames[0]).toHaveTextContent('HTML');
    expect(langNames[1]).toHaveTextContent('javascript');
    expect(langNames[2]).toHaveTextContent('css');
  });

  it('should hide stats values when hide_values is true (donut-vertical layout)', () => {
    document.body.innerHTML = renderTopLanguages(langs, {
      layout: 'donut-vertical',
      hide_values: true,
    });

    expect(screen.getByTestId('lang-items')).not.toHaveTextContent('%');
    expect(screen.queryAllByTestId('lang-name')).toHaveLength(3);
  });

  it('should hide stats values when hide_values is true (pie layout)', () => {
    document.body.innerHTML = renderTopLanguages(langs, {
      layout: 'pie',
      hide_values: true,
    });

    // a label matches by substring, so it is the list as a whole that must carry no value
    expect(screen.getByTestId('lang-items')).not.toHaveTextContent('%');
    let langNames = screen.queryAllByTestId('lang-name');
    expect(langNames[0]).toHaveTextContent('HTML');
    expect(langNames[1]).toHaveTextContent('javascript');
    expect(langNames[2]).toHaveTextContent('css');
    expect(screen.queryAllByTestId('lang-pie')[0]).toHaveAttribute('size', '40');

    document.body.innerHTML = renderTopLanguages(
      { HTML: langs.HTML },
      {
        layout: 'pie',
        hide_values: true,
      },
    );

    langNames = screen.queryAllByTestId('lang-name');
    const pies = screen.queryAllByTestId('lang-pie');
    expect(langNames[0]).toHaveTextContent('HTML');
    expect(pies).toHaveLength(1);
    expect(pies[0]).toHaveAttribute('size', '100');
    expect(pies[0]?.tagName).toBe('circle');
  });
});

describe('test top-langs API', () => {
  it('should return a permanent error for an invalid color parameter', async () => {
    const result = await topLangsApi({ username: 'user', title_color: 'not-a-color' }, testConfig);

    expect(result.status).toBe('error');
    expect(result.content).toContain(`Invalid color input for parameter &#34;title_color&#34;`);
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
      expect(() => renderTopLanguages(langsWithNullColor, { layout })).not.toThrow();

      const card = renderTopLanguages(langsWithNullColor, { layout });
      expect(card).toContain('#858585');
    },
  );
});
