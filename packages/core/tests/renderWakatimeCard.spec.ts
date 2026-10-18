import { screen } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import { renderWakatimeCard } from '../src/cards/wakatime/index.ts';
import { measureText } from '../src/common/text.ts';

import { draw, xOf } from './_card.ts';
import { wakaTimeData } from './fetchWakatime.spec.ts';

/** @returns Where a compact label's ink ends across the card. */
const rightEdge = (label: HTMLElement): number => xOf(label) + measureText(label.textContent, 11);

describe('Test Render WakaTime Card', () => {
  it('should render correctly', () => {
    const card = renderWakatimeCard(wakaTimeData.data);
    expect(card).toMatchSnapshot();
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
    // `renderWakatimeCard` rewrites the percentages in place, so the shared fixture is copied
    document.body.innerHTML = renderWakatimeCard(structuredClone(wakaTimeData.data), {
      layout: 'compact',
      card_width,
    });

    // the track keeps the card's own padding on both sides
    const track = document.querySelector('#rect-mask rect');
    expect(track).toHaveAttribute('x', '25');
    expect(track).toHaveAttribute('width', String(card_width - 50));

    // and the stacked segments start where it does, rather than under its left edge
    expect(screen.getAllByTestId('lang-progress')[0]).toHaveAttribute('x', '25');
  });

  it.each([undefined, 400])(
    'should keep long compact labels clear of each other and inside the card (card_width %s)',
    (card_width) => {
      const data = structuredClone(wakaTimeData.data);
      data.languages = data.languages.map((lang) => ({
        ...lang,
        name: `${lang.name} With An Extended And Very Long Name`,
      }));
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
      expect(Math.max(...right.map((label) => rightEdge(label)))).toBeLessThanOrEqual(width - 25);
    },
  );

  it("should leave the caller's percentages as they were", () => {
    const data = structuredClone(wakaTimeData.data);
    // its own percentages, so dropping the last always rescales the rest
    data.languages = data.languages.map((lang, index) => ({ ...lang, percent: 50 - index * 10 }));
    const percents = data.languages.map(({ percent }) => percent);

    renderWakatimeCard(data, { layout: 'compact', langs_count: 2 });

    expect(data.languages.map(({ percent }) => percent)).toStrictEqual(percents);
  });

  it('should move the compact right column out by half of what a card_width adds', () => {
    document.body.innerHTML = renderWakatimeCard(structuredClone(wakaTimeData.data), {
      layout: 'compact',
      card_width: 600,
    });

    // 230 on the default 500, plus half the extra 100
    expect(screen.getAllByTestId('lang-name')[1]?.parentElement).toHaveAttribute(
      'transform',
      'translate(280, 25)',
    );
  });

  it('should hide languages when hide is passed', () => {
    document.body.innerHTML = renderWakatimeCard(wakaTimeData.data, {
      hide_langs: ['YAML', 'Other'],
    });

    expect(screen.queryByTestId(/YAML/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/Other/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/TypeScript/i)).toBeInTheDocument();
  });

  it('should render translations', () => {
    document.body.innerHTML = renderWakatimeCard({}, { locale: 'cn' });
    expect(document.querySelector('.header')).toHaveTextContent('WakaTime 周统计');
    expect(document.querySelector('text.stat.bold')).toHaveTextContent(
      'WakaTime 用户个人资料未公开',
    );
  });

  it('should render without rounding', () => {
    document.body.innerHTML = renderWakatimeCard(wakaTimeData.data, {
      border_radius: 0,
    });
    expect(document.querySelector('rect')).toHaveAttribute('rx', '0');
    document.body.innerHTML = renderWakatimeCard(wakaTimeData.data, {});
    expect(document.querySelector('rect')).toHaveAttribute('rx', '8');
  });

  it('should show "no coding activity this week" message when there has not been activity', () => {
    document.body.innerHTML = renderWakatimeCard(
      {
        ...wakaTimeData.data,
        languages: [],
      },
      {},
    );
    expect(document.querySelector('.stat')).toHaveTextContent('No coding activity this week');
  });

  it('should show "no coding activity this week" message when using compact layout and there has not been activity', () => {
    document.body.innerHTML = renderWakatimeCard(
      {
        ...wakaTimeData.data,
        languages: [],
      },
      {
        layout: 'compact',
      },
    );
    expect(document.querySelector('.stat')).toHaveTextContent('No coding activity this week');
  });

  it('should render correctly with percent display format', () => {
    const card = renderWakatimeCard(wakaTimeData.data, {
      value_format: 'percent',
    });
    expect(card).toMatchSnapshot();
  });

  it('should render correctly with gradient background', () => {
    const card = renderWakatimeCard(wakaTimeData.data, {
      theme: 'ambient_gradient',
    });
    expect(card).toMatchSnapshot();
  });
});
