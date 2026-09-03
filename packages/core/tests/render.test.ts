import { queryByTestId } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import {
  countWrappedLines,
  renderError,
  splitWrappedText,
  wrapTextMultiline,
} from '../src/common/render.js';

describe('Test splitWrappedText', () => {
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

describe('Test wrapTextMultiline', () => {
  it('should not wrap small texts', () => {
    {
      const multiLineText = wrapTextMultiline('Small text should not wrap', 130, 11, 3);
      expect(multiLineText).toStrictEqual(['Small text should not wrap']);
    }
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

describe('Test countWrappedLines', () => {
  it('should return 1 for empty text', () => {
    expect(countWrappedLines('', 10, 200, 10)).toBe(1);
  });

  it('should return 1 when all text fits on a single line', () => {
    expect(countWrappedLines('hi', 10, 200, 10)).toBe(1);
  });

  it('should return 2 when a two-word string wraps', () => {
    expect(countWrappedLines('hello world', 10, 25, 10)).toBe(2);
  });

  it('should split a word wider than maxWidth (overflow-wrap: anywhere)', () => {
    expect(countWrappedLines('aaaa', 10, 15, 10)).toBe(2);
  });

  it('should cap the result at maxLines', () => {
    expect(countWrappedLines('word '.repeat(10), 10, 25, 3)).toBe(3);
  });

  it('should handle complex whitespace characters', () => {
    expect(countWrappedLines('One         two three', 10, 25, 10)).toBe(5);
  });

  it('trailing spaces should not cause line breaks', () => {
    expect(countWrappedLines('hi hi ', 10, 12, 10)).toBe(2);
  });
});

describe('Test renderError', () => {
  it('should contain error messages', () => {
    document.body.innerHTML = renderError({ message: 'Something went wrong' });
    expect(queryByTestId(document.body, 'message')?.children[0]).toHaveTextContent(
      /Something went wrong/gim,
    );
    expect(queryByTestId(document.body, 'message')?.children[1]).toBeEmptyDOMElement();

    // Secondary message
    document.body.innerHTML = renderError({
      message: 'Something went wrong',
      secondaryMessage: 'Secondary Message',
    });
    expect(queryByTestId(document.body, 'message')?.children[1]).toHaveTextContent(
      /Secondary Message/gim,
    );
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
