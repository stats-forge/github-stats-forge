import { screen } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import { renderWakatimeCard } from '../src/cards/wakatime/index.ts';
import { CARD_STYLE } from '../src/common/brand.ts';
import { getCardColors } from '../src/common/color.ts';
import { getLanguageColor } from '../src/common/languageColors.ts';
import { measureText } from '../src/common/text.ts';
import type { WakaTimeData } from '../src/fetchers/wakatime/types.ts';

import { cssValue, draw, exactly, xOf } from './_card.ts';
import { wakaTimeData } from './_wakatime.ts';

/** @returns Where a compact label's ink ends across the card. */
const rightEdge = (label: HTMLElement): number => xOf(label) + measureText(label.textContent, 11);

describe('Test Render WakaTime Card', () => {
  it('should render correctly', () => {
    const card = renderWakatimeCard(wakaTimeData.data);
    expect(card).toMatchSnapshot();
  });

  it.each(['normal', 'compact'] as const)(
    "should lead the %s layout with the range's total and its daily average",
    (layout) => {
      const card = draw(renderWakatimeCard(wakaTimeData.data, { layout }));

      expect(screen.getByTestId('total')).toHaveTextContent(exactly('22 hrs 40 mins'));
      expect(screen.getByTestId('daily-average')).toHaveTextContent(exactly('4 hrs 32 mins a day'));
      expect(card.querySelector('desc')).toHaveTextContent(
        /^22 hrs 40 mins, 4 hrs 32 mins a day\. /u,
      );
    },
  );

  it('should total without Other once Other is hidden', () => {
    const card = draw(renderWakatimeCard(wakaTimeData.data, { hide_langs: ['other'] }));

    expect(screen.getByTestId('total')).toHaveTextContent(exactly('22 hrs 21 mins'));
    expect(screen.getByTestId('daily-average')).toHaveTextContent(exactly('4 hrs 28 mins a day'));
    expect(card.querySelector('desc')).toHaveTextContent(
      /^22 hrs 21 mins, 4 hrs 28 mins a day\. /u,
    );
  });

  it('should keep the daily average in the description alone on a card too narrow to draw it', () => {
    const card = draw(renderWakatimeCard(wakaTimeData.data, { card_width: 250 }));

    expect(screen.getByTestId('total')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-average')).not.toBeInTheDocument();
    expect(card.querySelector('desc')).toHaveTextContent(
      /^22 hrs 40 mins, 4 hrs 32 mins a day\. /u,
    );
  });

  it('should fit its headline into the floor rather than stack it on top', () => {
    const [first] = wakaTimeData.data.languages;
    const card = draw(
      renderWakatimeCard({ ...wakaTimeData.data, languages: first ? [first] : [] }),
    );

    expect(screen.getByTestId('headline')).toBeInTheDocument();
    expect(card).toHaveAttribute('height', '150');
  });

  it('should draw no headline when there is no activity to total', () => {
    const card = draw(renderWakatimeCard({ ...wakaTimeData.data, languages: [] }));

    expect(screen.queryByTestId('headline')).not.toBeInTheDocument();
    expect(card).toHaveAttribute('height', '150');
  });

  it("should paint the compact chart in GitHub's language colors", () => {
    draw(renderWakatimeCard(wakaTimeData.data, { layout: 'compact' }));

    const names = screen
      .getAllByTestId('lang-name')
      .map((label) => label.textContent.split(' - ')[0]);
    const segments = screen.getAllByTestId('lang-progress');
    for (const [index, segment] of segments.entries()) {
      expect(segment).toHaveAttribute('fill', getLanguageColor(names[index] ?? ''));
    }
  });

  it("should draw the bars' track in the theme's track color, not the text's", () => {
    draw(renderWakatimeCard(wakaTimeData.data, { theme: 'ember_dark' }));

    expect(cssValue('.progress-background', 'fill')).toBe(
      getCardColors('ember_dark').progBarBgColor,
    );
  });

  it('should render correctly with compact layout', () => {
    const card = renderWakatimeCard(wakaTimeData.data, { layout: 'compact' });

    expect(card).toMatchSnapshot();
  });

  it('should render correctly with compact layout when langs_count is set', () => {
    const card = renderWakatimeCard(wakaTimeData.data, {
      layout: 'compact',
      langs_count: 2,
    });

    expect(card).toMatchSnapshot();
  });

  it('should keep the compact layout progress bar centered', () => {
    const card_width = 600;
    draw(renderWakatimeCard(wakaTimeData.data, { layout: 'compact', card_width }));

    // the track keeps the card's own padding on both sides
    const track = document.querySelector('#rect-mask rect');
    expect(track).toHaveAttribute('x', String(CARD_STYLE.padding.x));
    expect(track).toHaveAttribute('width', String(card_width - 2 * CARD_STYLE.padding.x));

    // and the stacked segments start where it does, rather than under its left edge
    expect(screen.getAllByTestId('lang-progress')[0]).toHaveAttribute(
      'x',
      String(CARD_STYLE.padding.x),
    );
  });

  it.each([undefined, 400])(
    'should keep long compact labels clear of each other and inside the card (card_width %s)',
    (card_width) => {
      const data: WakaTimeData = {
        ...wakaTimeData.data,
        languages: wakaTimeData.data.languages.map((lang) => ({
          ...lang,
          name: `${lang.name} With An Extended And Very Long Name`,
        })),
      };
      const width = Number(
        draw(renderWakatimeCard(data, { layout: 'compact', card_width })).getAttribute('width'),
      );

      // languages alternate between the columns, left first
      const labels = screen.getAllByTestId('lang-name');
      const left = labels.filter((_, index) => index % 2 === 0);
      const right = labels.filter((_, index) => index % 2 === 1);

      expect(Math.max(...left.map((label) => rightEdge(label)))).toBeLessThan(
        Math.min(...right.map((label) => xOf(label))),
      );
      expect(Math.max(...right.map((label) => rightEdge(label)))).toBeLessThanOrEqual(
        width - CARD_STYLE.padding.x,
      );
    },
  );

  it("should leave the caller's percentages as they were", () => {
    // its own percentages, so dropping the last always rescales the rest
    const data: WakaTimeData = {
      ...wakaTimeData.data,
      languages: wakaTimeData.data.languages.map((lang, index) => ({
        ...lang,
        percent: 50 - index * 10,
      })),
    };
    const percents = data.languages.map(({ percent }) => percent);

    renderWakatimeCard(data, { layout: 'compact', langs_count: 2 });

    expect(data.languages.map(({ percent }) => percent)).toStrictEqual(percents);
  });

  it('should move the compact right column out by half of what a card_width adds', () => {
    draw(renderWakatimeCard(wakaTimeData.data, { layout: 'compact', card_width: 600 }));

    // 230 on the default 500, plus half the extra 100
    expect(screen.getAllByTestId('lang-name')[1]?.parentElement).toHaveAttribute(
      'transform',
      'translate(280, 25)',
    );
  });

  it('should hide languages when hide is passed', () => {
    draw(
      renderWakatimeCard(wakaTimeData.data, {
        hide_langs: ['YAML', 'Other'],
      }),
    );

    expect(screen.queryByTestId(/YAML/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/Other/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/TypeScript/i)).toBeInTheDocument();
  });

  it('should render translations', () => {
    draw(renderWakatimeCard({}, { locale: 'zh-cn' }));
    expect(document.querySelector('.header')).toHaveTextContent(exactly('WakaTime 周统计'));
    expect(document.querySelector('text.stat.bold')).toHaveTextContent(
      exactly('WakaTime 用户个人资料未公开'),
    );
  });

  it('should render without rounding', () => {
    draw(
      renderWakatimeCard(wakaTimeData.data, {
        border_radius: 0,
      }),
    );
    expect(document.querySelector('rect')).toHaveAttribute('rx', '0');
    draw(renderWakatimeCard(wakaTimeData.data, {}));
    expect(document.querySelector('rect')).toHaveAttribute('rx', '14');
  });

  it('should show "no coding activity this week" message when there has not been activity', () => {
    draw(
      renderWakatimeCard(
        {
          ...wakaTimeData.data,
          languages: [],
        },
        {},
      ),
    );
    expect(document.querySelector('.stat')).toHaveTextContent(
      exactly('No coding activity this week'),
    );
  });

  it('should show "no coding activity this week" message when using compact layout and there has not been activity', () => {
    draw(
      renderWakatimeCard(
        {
          ...wakaTimeData.data,
          languages: [],
        },
        {
          layout: 'compact',
        },
      ),
    );
    expect(document.querySelector('.stat')).toHaveTextContent(
      exactly('No coding activity this week'),
    );
  });

  it('should render correctly with percent display format', () => {
    const card = renderWakatimeCard(wakaTimeData.data, {
      value_format: 'percent',
    });
    expect(card).toMatchSnapshot();
  });
});
