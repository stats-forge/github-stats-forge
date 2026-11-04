/**
 * @file The heat drawn as runs of solid color.
 */
import { describe, expect, it } from 'vitest';

import { getCardColors } from '../src/common/color.ts';
import type { CardColors } from '../src/common/color.ts';
import { heatText, heatTextRules } from '../src/common/heatText.ts';
import { el, renderMarkup, style } from '../src/markup/index.ts';

const runs = (text: string): Array<{ class: unknown; text: string }> =>
  heatText(text).map((run) => ({
    class: run.attributes.class,
    text: run.children.filter((child) => typeof child === 'string').join(''),
  }));

describe(heatText, () => {
  it('should keep the text whole, in order', () => {
    const text = "Ember Smith's GitHub Stats";
    expect(
      runs(text)
        .map((run) => run.text)
        .join(''),
    ).toBe(text);
  });

  it('should run from the heat start to its end', () => {
    const drawn = runs('Ember Smith is on fire');
    expect(drawn.at(0)?.class).toBe('heat-step-0');
    expect(drawn.at(-1)?.class).toBe('heat-step-15');
  });

  it('should join the glyphs of one step into one run', () => {
    const text = 'Ember Smith is on fire, and has been all year';
    expect(runs(text).length).toBeLessThan([...text].length);
  });

  it('should color a single glyph from the middle of the heat', () => {
    expect(runs('S')).toStrictEqual([{ class: 'heat-step-8', text: 'S' }]);
  });

  it('should draw nothing for an empty text', () => {
    expect(heatText('')).toStrictEqual([]);
  });
});

describe(heatTextRules, () => {
  it('should color the first step with the first stop and the last with the last', () => {
    const colors: CardColors = {
      ...getCardColors('ember_light'),
      heat: ['#ff0000', '#00ff00', '#0000ff'],
    };
    const css = renderMarkup(el('svg', {}, style(heatTextRules(colors))));
    expect(css).toMatch(/\.heat-step-0 \{\s*fill: #ff0000;/u);
    expect(css).toMatch(/\.heat-step-15 \{\s*fill: #0000ff;/u);
  });
});
