import { screen } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import { renderError } from '../src/common/render.ts';
import { splitWrappedText, wrapTextMultiline } from '../src/common/text.ts';

import { exactly } from './_card.ts';

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
