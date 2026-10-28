import { cssToObject } from '@uppercod/css-to-object';
import { describe, expect, it } from 'vitest';

import { draw } from './_card.ts';
import { cards } from './_cards.ts';

/** @returns The drawn card's light-mode rules that run `animationName`. */
const rulesAnimating = (animationName: string): Array<[string, Record<string, string>]> =>
  Object.entries<Record<string, string>>(
    cssToObject(document.querySelector('style')?.textContent ?? '')[':host'] ?? {},
  ).filter(([, declarations]) => declarations['animation']?.startsWith(`${animationName} `));

describe('card animation', () => {
  it.each(Object.entries(cards))('%s fills backwards, never forwards', (_name, render) => {
    draw(render());

    const css = document.querySelector('style')?.textContent ?? '';
    expect(css).toContain('backwards');
    expect(css).not.toContain('forwards');
  });

  // where animations do not run, a hidden base style would hide the element for good
  it.each(Object.entries(cards))('%s fades in from a visible base style', (_name, render) => {
    draw(render());

    const fading = rulesAnimating('fadeInAnimation');
    expect(fading).not.toHaveLength(0);
    const hidden = fading.filter(([, declarations]) => 'opacity' in declarations);
    expect(Object.fromEntries(hidden)).toStrictEqual({});
  });
});
