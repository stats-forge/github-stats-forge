/**
 * @file The anvil's form controls, from Web Awesome.
 *
 * Web Awesome rather than hand-written: a native `<select>` cannot draw a theme's colors beside
 * its name, and a listbox written here would be one more accessible widget to own.
 *
 * Its icons must be overridden — `wa-icon` fetches Font Awesome's kit, and this page promises
 * nothing leaves it — so every icon slot is inline SVG and the e2e suite guards that.
 */

import { themeSwatch } from './swatch.ts';

import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/checkbox/checkbox.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/divider/divider.js';
import '@awesome.me/webawesome/dist/components/radio-group/radio-group.js';
import '@awesome.me/webawesome/dist/components/radio/radio.js';
import '@awesome.me/webawesome/dist/components/details/details.js';

/*
 * Not the same as the theme named `default` — the gist card's own default is `default_repocard` —
 * and both appear in the same list, so the row has to read as distinct from it.
 */
const DEFAULT_LABEL = "the card's default";

/** @returns A group heading, preceded by a rule where it is not the first. */
const buildHeading = (text: string, first: boolean): Array<HTMLElement> => {
  const heading = document.createElement('small');
  heading.className = 'anvil-option-group';
  heading.textContent = text;
  return first ? [heading] : [document.createElement('wa-divider'), heading];
};

/** @returns An inline caret for a select's `expand-icon` slot, in place of a fetched one. */
const caret = (): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('slot', 'expand-icon');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M3.2 5.7 8 10.5l4.8-4.8');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');

  svg.append(path);
  return svg;
};

/** @returns A select over a closed set, with an empty first row for the card's own default. */
const createSelect = ({
  label,
  option,
  values,
  value,
  swatches = false,
  includeDefault = true,
  onPick,
}: {
  label: string;
  /** The query param this control writes, which is also how the tests find it. */
  option: string;
  /** The values on offer, flat, or in named groups when there are enough to want headings. */
  values: ReadonlyArray<string> | ReadonlyArray<{ label: string; values: ReadonlyArray<string> }>;
  value: string;
  /** Whether each row shows what the value looks like — true for the theme picker alone. */
  swatches?: boolean;
  /** False for the card picker, where there is always a card and so nothing to fall back to. */
  includeDefault?: boolean;
  onPick: (value: string) => void;
}): HTMLElement => {
  const select = document.createElement('wa-select');
  select.size = 's';
  select.label = label;
  select.value = value;
  // `label` is a Lit property and is not reflected, so the control carries its own handle.
  select.dataset['option'] = option;
  select.append(caret());

  /** @returns One row of the list. */
  const buildRow = (candidate: string): HTMLElement => {
    const row = document.createElement('wa-option');
    row.value = candidate;
    row.textContent = candidate === '' ? DEFAULT_LABEL : candidate;

    if (swatches && candidate !== '') {
      const swatch = themeSwatch(candidate);
      if (swatch !== undefined) {
        swatch.slot = 'start';
        row.append(swatch);
      }
    }
    return row;
  };

  if (includeDefault) {
    select.append(buildRow(''));
  }

  const grouped = values.length > 0 && typeof values[0] === 'object';
  if (grouped) {
    const groups = values as ReadonlyArray<{ label: string; values: ReadonlyArray<string> }>;
    for (const [index, group] of groups.entries()) {
      select.append(
        ...buildHeading(group.label, index === 0 && !includeDefault),
        ...group.values.map((candidate) => buildRow(candidate)),
      );
    }
  } else {
    select.append(...(values as ReadonlyArray<string>).map((candidate) => buildRow(candidate)));
  }

  /** Mirrors the chosen row's swatch onto the closed select, which shows only text otherwise. */
  const paintStart = (): void => {
    for (const stale of select.querySelectorAll(':scope > .anvil-swatch')) {
      stale.remove();
    }
    if (!swatches || select.value === '') {
      return;
    }
    const swatch = themeSwatch(String(select.value));
    if (swatch !== undefined) {
      swatch.slot = 'start';
      select.append(swatch);
    }
  };

  select.addEventListener('change', () => {
    paintStart();
    onPick(String(select.value));
  });

  paintStart();
  return select;
};

/**
 * A `fieldset` and `legend`, so the group is named for a screen reader with no id to wire up.
 *
 * @returns The group.
 */
const createCheckGroup = ({
  label,
  option,
  values,
  picked,
  onToggle,
}: {
  label: string;
  /** The query param this group writes, which is also how the tests find it. */
  option: string;
  values: ReadonlyArray<string>;
  picked: Set<string>;
  onToggle: () => void;
}): HTMLElement => {
  const group = document.createElement('fieldset');
  group.className = 'anvil-field anvil-check-group';
  group.dataset['option'] = option;

  const legend = document.createElement('legend');
  legend.textContent = label;
  group.append(legend);

  const boxes = document.createElement('div');
  boxes.className = 'anvil-checkboxes';

  for (const value of values) {
    const box = document.createElement('wa-checkbox');
    box.size = 's';
    box.value = value;
    box.checked = picked.has(value);
    box.textContent = value;
    box.addEventListener('change', () => {
      if (box.checked) {
        picked.add(value);
      } else {
        picked.delete(value);
      }
      onToggle();
    });
    boxes.append(box);
  }

  group.append(boxes);
  return group;
};

/** @returns A single-line field, for a value with no closed set behind it. */
const createTextField = ({
  label,
  option,
  placeholder = '',
  hint,
  step,
  value = '',
  onInput,
}: {
  label: string;
  /** The query param this control writes, which is also how the tests find it. */
  option: string;
  placeholder?: string;
  hint?: string | undefined;
  /** How finely a numeric value moves; absent for one that is not a number. */
  step?: 1 | 'any' | undefined;
  value?: string;
  onInput: (value: string) => void;
}): HTMLElementTagNameMap['wa-input'] => {
  const field = document.createElement('wa-input');
  field.size = 's';
  field.label = label;
  field.dataset['option'] = option;
  field.placeholder = placeholder;
  field.spellcheck = false;
  field.autocomplete = 'off';
  field.value = value;
  if (step !== undefined) {
    // The numeric keyboard and the spinners, stepping as coarsely as the param is read.
    field.type = 'number';
    field.step = step;
  }
  if (hint !== undefined) {
    field.hint = hint;
  }
  field.addEventListener('input', () => {
    onInput(field.value ?? '');
  });
  return field;
};

/** @returns A bar of labelled segments, one of them chosen. */
const createSegments = ({
  label,
  values,
  value,
  hint,
  onPick,
}: {
  label: string;
  /** Each segment: the value it writes, and the word on it. */
  values: ReadonlyArray<readonly [string, string]>;
  value: string;
  hint?: string | undefined;
  onPick: (value: string) => void;
}): HTMLElementTagNameMap['wa-radio-group'] => {
  const group = document.createElement('wa-radio-group');
  group.size = 's';
  group.label = label;
  group.orientation = 'horizontal';
  group.value = value;
  if (hint !== undefined) {
    group.hint = hint;
  }

  for (const [candidate, text] of values) {
    const radio = document.createElement('wa-radio');
    radio.appearance = 'button';
    radio.size = 's';
    radio.value = candidate;
    radio.textContent = text;
    group.append(radio);
  }

  group.addEventListener('change', () => {
    onPick(String(group.value ?? ''));
  });

  return group;
};

/** `DEFAULT` is a sentinel: a radio group cannot carry the empty value the query uses. */
const TRI_STATE = [
  ['default', 'default'],
  ['true', 'on'],
  ['false', 'off'],
] as const;

/** The sentinel the "leave it to the card" row carries. */
const TRI_DEFAULT = 'default';

/**
 * **Not a switch.** A boolean here has three states — on, off, and *not said* — because a card's
 * own default may be either: `text_bold` is on for the stats card and off for the repo card, so a
 * switch could not turn the stats card's bold off.
 *
 * @returns The group.
 */
const createTriState = ({
  label,
  option,
  hint,
  value,
  onPick,
}: {
  label: string;
  /** The query param this control writes, which is also how the tests find it. */
  option: string;
  hint?: string | undefined;
  /** The value written so far: `''` when the card's own default still stands. */
  value: string;
  onPick: (value: string) => void;
}): HTMLElement => {
  const group = createSegments({
    label,
    values: TRI_STATE,
    value: value === '' ? TRI_DEFAULT : value,
    hint,
    onPick: (picked) => {
      onPick(picked === TRI_DEFAULT ? '' : picked);
    },
  });
  group.dataset['option'] = option;
  return group;
};

/**
 * A collapsed section, for the options every card shares.
 *
 * Thirty controls in one column is a wall, and the colours and the border are the half a reader
 * reaches for last, so they start folded away.
 *
 * @returns The section.
 */
const createSection = (
  label: string,
  contents: ReadonlyArray<HTMLElement>,
  open: boolean,
): HTMLElement => {
  const section = document.createElement('wa-details');
  section.summary = label;
  section.open = open;
  section.className = 'anvil-section';

  const inner = document.createElement('div');
  inner.className = 'anvil-controls';
  inner.append(...contents);
  section.append(inner);
  return section;
};

/** @returns A line of explanation under a group of controls, styled as the page's own notes are. */
const createNote = (text: string): HTMLElement => {
  const note = document.createElement('p');
  note.className = 'anvil-note';
  note.textContent = text;
  return note;
};

export {
  createCheckGroup,
  createNote,
  createSection,
  createSegments,
  createSelect,
  createTextField,
  createTriState,
};
