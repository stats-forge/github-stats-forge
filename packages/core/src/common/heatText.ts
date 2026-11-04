/**
 * @file Text in the heat, as runs of solid color. WebKit draws gradient-filled text in an SVG
 * shown as an `<img>` at 1x, which blurs it on a retina screen; a solid fill stays sharp.
 */
import type { CssChild, MarkupElement } from '../markup/index.ts';
import { el, rule } from '../markup/index.ts';

import { heatAt } from './color.ts';
import type { CardColors } from './color.ts';
import { measureText } from './text.ts';

/** How many colors the heat is cut into, enough that no run reads as a band. */
const steps = 16;

/** @returns The class of the heat step `step`, from 0, the heat's start, to `steps - 1`. */
const stepClass = (step: number): string => `heat-step-${String(step)}`;

/**
 * Cuts a text into runs that each take the heat's color at their glyphs' middle.
 *
 * @returns The text's `tspan`s, to go inside a `text`.
 */
const heatText = (text: string): Array<MarkupElement> => {
  const total = measureText(text);
  const runs: Array<{ step: number; text: string }> = [];
  let drawn = 0;

  for (const char of text) {
    const width = measureText(char);
    const middle = total === 0 ? 0 : (drawn + width / 2) / total;
    const step = Math.round(middle * (steps - 1));
    drawn += width;

    const last = runs.at(-1);
    if (last?.step === step) {
      last.text += char;
    } else {
      runs.push({ step, text: char });
    }
  }

  return runs.map((run) => el('tspan', { class: stepClass(run.step) }, run.text));
};

/** WebKit leaves a `text`'s baseline off its `tspan`s, which lifts a centered rank letter. */
const HEAT_TEXT_BASELINE = rule('tspan', { 'dominant-baseline': 'inherit' });

/** @returns The rules coloring each heat step, for one color scheme. */
const heatTextRules = (colors: CardColors): Array<CssChild> =>
  Array.from({ length: steps }, (_, step) =>
    rule(`.${stepClass(step)}`, { fill: heatAt(colors.heat, step / (steps - 1)) }),
  );

export { HEAT_TEXT_BASELINE, heatText, heatTextRules };
