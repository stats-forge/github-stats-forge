import { screen } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import {
  createLanguageNode,
  createProgressNode,
  createTextNode,
  formatCount,
  iconWithLabel,
  renderError,
} from '../src/common/render.ts';
import { splitWrappedText, wrapTextMultiline } from '../src/common/text.ts';
import { renderMarkup } from '../src/markup/index.ts';

import { draw, exactly } from './_card.ts';

describe(splitWrappedText, () => {
  it('should return an empty array for empty text', () => {
    expect(splitWrappedText('', 10, 200)).toStrictEqual([]);
  });

  it('should split a two-word string across lines', () => {
    expect(splitWrappedText('hello world', 10, 25)).toStrictEqual(['hello', 'world']);
  });

  it('should split a word wider than maxWidth', () => {
    expect(splitWrappedText('aaaa', 10, 15)).toStrictEqual(['aa', 'aa']);
  });

  it('should handle mix of short and long words', () => {
    expect(splitWrappedText('short looooong', 10, 40)).toStrictEqual(['short', 'looooon', 'g']);
  });

  it('should handle complex whitespace characters', () => {
    expect(splitWrappedText('One         two three', 10, 25)).toStrictEqual([
      'One',
      '     ',
      '  ',
      'two',
      'three',
    ]);
  });

  it('trailing spaces should not cause line breaks', () => {
    expect(splitWrappedText('hi hi ', 10, 12)).toStrictEqual(['hi', 'hi']);
  });
});

describe(wrapTextMultiline, () => {
  it('should not wrap small texts', () => {
    expect(wrapTextMultiline('Small text should not wrap', 130, 11, 3)).toStrictEqual([
      'Small text should not wrap',
    ]);
  });

  it('should wrap large texts', () => {
    const multiLineText = wrapTextMultiline('Hello world long long long text', 130, 11, 3);
    expect(multiLineText).toStrictEqual(['Hello world long long', 'long text']);
  });

  it('should wrap large texts and limit max lines', () => {
    const multiLineText = wrapTextMultiline('Hello world long long long text', 53, 11, 2);
    expect(multiLineText).toStrictEqual(['Hello', 'world long...']);
  });

  it('should handle chinese characters', () => {
    const multiLineText = wrapTextMultiline(
      '专门为刚开始刷题的同学准备的算法基地，没有最细只有更细，立志用动画将晦涩难懂的算法说的通俗易懂！',
      130,
      11,
      3,
    );
    expect(multiLineText).toHaveLength(3);
    // Plain characters: the escaping happens when the line is serialized into the card.
    expect(multiLineText[0]).toHaveLength(11);
  });
});

describe(createProgressNode, () => {
  // the bar grows to this width, so a renderer that skips the animation still draws it whole
  it('should draw the fill at its full width', () => {
    draw(
      `<svg>${renderMarkup(createProgressNode({ x: 0, y: 0, width: 200, color: '#f00', progress: 40, delay: 0 }))}</svg>`,
    );

    expect(screen.getByTestId('lang-progress')).toHaveAttribute('width', '40%');
    expect(document.querySelector('.lang-progress')).toHaveAttribute('width', '100%');
  });
});

describe(renderError, () => {
  it('should contain error messages', () => {
    document.body.innerHTML = renderError({ message: 'Something went wrong' });
    expect(screen.getByTestId('message').children[0]).toHaveTextContent(
      exactly('Something went wrong'),
    );
    expect(screen.getByTestId('message').children[1]).toBeEmptyDOMElement();

    document.body.innerHTML = renderError({
      message: 'Something went wrong',
      secondaryMessage: 'Secondary Message',
    });
    expect(screen.getByTestId('message').children[1]).toHaveTextContent(
      exactly('Secondary Message'),
    );
  });

  it('points a reader at this project, on its own line', () => {
    document.body.innerHTML = renderError({ message: 'Nope' });
    expect(screen.getByTestId('report')).toHaveTextContent(
      exactly('File an issue at https://tinyurl.com/github-stats-forge-bug'),
    );
  });

  it('offers no report line for a failure that is not reportable', () => {
    document.body.innerHTML = renderError({
      message: 'Nope',
      renderOptions: { reportable: false },
    });
    expect(screen.queryByTestId('report')).not.toBeInTheDocument();
  });

  it('should encode error message', () => {
    const errorSVG = renderError({
      message: "<script>alert('xss')</script>",
    });

    expect(errorSVG).toContain('&#60;script&#62;alert(&#39;xss&#39;)&#60;/script&#62;');

    document.body.innerHTML = errorSVG;
    const svg = document.querySelector('svg');
    expect(svg?.querySelector('script')).toBeNull();
  });

  it('should encode secondary error message', () => {
    const errorSVG = renderError({
      message: 'Error',
      secondaryMessage: '"title_color"<img src=x onerror="alert(1)">',
    });

    expect(errorSVG).toContain('&#60;img');

    document.body.innerHTML = errorSVG;
    const svg = document.querySelector('svg');
    expect(svg?.querySelector('img')).toBeNull();
  });
});

describe(formatCount, () => {
  it.each([
    { format: 'short', precision: undefined, written: '1.2k' },
    { format: 'short', precision: 2, written: '1.23k' },
    { format: 'short', precision: 5, written: '1.23k' },
    { format: 'short', precision: -1, written: '1k' },
    { format: 'LONG', precision: 2, written: '1234' },
  ])(
    'writes 1234 as $written for $format with $precision decimals',
    ({ format, precision, written }) => {
      expect(formatCount(1234, format, precision)).toBe(written);
    },
  );
});

describe('the node builders', () => {
  const progress = { x: 0, y: 0, width: 200, progress: 40, delay: 0 };
  const text = {
    icon: undefined,
    label: 'Stars',
    value: 3,
    id: 'stars',
    index: 0,
    showIcons: false,
    shiftValuePos: 0,
    bold: false,
    numberFormat: 'short',
  };

  // each value lands in an attribute, so anything else would be written into the SVG as is
  it.each([
    { what: 'language color', build: (): unknown => createLanguageNode('TypeScript', 'red') },
    {
      what: 'progress color',
      build: (): unknown => createProgressNode({ ...progress, color: 'red' }),
    },
    { what: 'width', build: (): unknown => createProgressNode({ ...progress, width: Number.NaN }) },
    { what: 'x', build: (): unknown => createProgressNode({ ...progress, x: Number.NaN }) },
    { what: 'y', build: (): unknown => createProgressNode({ ...progress, y: Number.NaN }) },
    { what: 'delay', build: (): unknown => createProgressNode({ ...progress, delay: Number.NaN }) },
    { what: 'iconSize', build: (): unknown => iconWithLabel(undefined, 1, 'stars', Number.NaN) },
    {
      what: 'labelXOffset',
      build: (): unknown => createTextNode({ ...text, labelXOffset: Number.NaN }),
    },
    {
      what: 'shiftValuePos',
      build: (): unknown => createTextNode({ ...text, shiftValuePos: Number.NaN }),
    },
    { what: 'index', build: (): unknown => createTextNode({ ...text, index: Number.NaN }) },
    {
      what: 'valueAnchorX',
      build: (): unknown => createTextNode({ ...text, valueAnchorX: Number.NaN }),
    },
  ])('refuses an invalid $what', ({ what, build }) => {
    expect(build).toThrow(`Invalid ${what}: `);
  });
});
