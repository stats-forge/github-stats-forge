import type WaToast from '@awesome.me/webawesome/dist/components/toast/toast.js';
import { COMMON_OPTIONS } from '@stats-forge/github-stats-forge-cli/cards';
import type { CardOption } from '@stats-forge/github-stats-forge-cli/cards';

import { BASE } from '../constants.ts';

import { CARD_GROUPS, CARDS, findCard } from './cards.ts';
import type { AnvilCard } from './cards.ts';
import {
  createCheckGroup,
  createNote,
  createSection,
  createSelect,
  createTextField,
  createTriState,
} from './controls.ts';
import { renderSampleCard } from './render.ts';
import { themeGroups } from './themes.ts';

/**
 * @file The anvil's controls, and what they redraw.
 *
 * Every list a control offers is read from core — `themes`, and each card's own `OPTIONS` — so the
 * page cannot offer a value the schema would reject. What core has no list for is reached through
 * the query box, which is the same string the CLI's `--config` file holds.
 */

/** The anvil draws the theme itself, with swatches and only the half of each pair the card wears. */
const OWN_CONTROL = 'theme';

/** Names of the options every card shares, which are folded into their own section. */
const SHARED_OPTIONS = new Set(COMMON_OPTIONS.map((option) => option.name));

/** How long to wait after a keystroke before redrawing. */
const TYPING_PAUSE = 250;

/** How long a toast stays up. */
const TOAST_PAUSE = 3000;

interface State {
  card: AnvilCard;
  /** Every option that writes a single string: text, number, choice, boolean and a free list. */
  values: Record<string, string>;
  /** The picked values of each option whose values are a closed set. */
  lists: Record<string, Set<string>>;
  theme: string;
  /** Anything the form has no control for, written as a query string. */
  extra: string;
}

/** @returns Whether the option's values are a closed set the reader picks several of. */
const isMultiValued = (option: CardOption): boolean =>
  option.kind === 'list' && option.choices !== undefined;

/** @returns The element, which the page is expected to carry. */
const need = (root: ParentNode, selector: string): HTMLElement => {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) {
    throw new Error(`The anvil is missing ${selector}`);
  }
  return found;
};

/** @returns The query, in the catalog's order rather than the order things were touched. */
const toQuery = (state: State): Record<string, string> => {
  const query: Record<string, string> = {};

  // The required params lead. Without them the file is one the CLI rejects, as it used to write.
  for (const { name } of state.card.required) {
    const value = state.values[name];
    if (value !== undefined && value !== '') {
      query[name] = value;
    }
  }

  if (state.theme !== '') {
    query['theme'] = state.theme;
  }

  for (const option of state.card.options) {
    const list = state.lists[option.name];
    if (list !== undefined) {
      if (list.size > 0) {
        query[option.name] = [...list].join(',');
      }
      continue;
    }

    const value = state.values[option.name];
    if (value !== undefined && value !== '') {
      query[option.name] = value;
    }
  }

  for (const [name, value] of new URLSearchParams(state.extra.replace(/^\?/, ''))) {
    if (name !== '') {
      query[name] = value;
    }
  }

  return query;
};

/** @returns A fresh state for that card, keeping nothing from the last one but the theme. */
const freshState = (card: AnvilCard, theme: string): State => ({
  card,
  // Seeded with the sampled identity, so the file is valid and the card draws before anything is typed.
  values: { ...card.identity },
  lists: Object.fromEntries(
    card.options.filter(isMultiValued).map((option) => [option.name, new Set<string>()]),
  ),
  theme,
  extra: '',
});

/** Wires the page up and draws the first card. */
const mount = (root: HTMLElement): void => {
  const cardPicker = need(root, '[data-anvil="card"]');
  const controls = need(root, '[data-anvil="controls"]');
  const extraHost = need(root, '[data-anvil="extra"]');
  const preview = need(root, '[data-anvil="preview"]');
  const status = need(root, '[data-anvil="status"]');
  const output = need(root, '[data-anvil="output"]');
  const download = need(root, '[data-anvil="download"]') as HTMLAnchorElement;
  const copy = need(root, '[data-anvil="copy"]') as HTMLButtonElement;
  const cardDocs = need(root, '[data-anvil="card-docs"]') as HTMLAnchorElement;
  const toast = need(root, '[data-anvil="toast"]') as WaToast;

  /*
   * Web Awesome announces a toast through its own shared live region — `role="status"` for a
   * normal one, `role="alert"` for a danger — which is why the buttons no longer retitle
   * themselves. A button's accessible name should not change under the pointer that is using it.
   */
  const notify = (message: string, variant: 'danger' | 'success' = 'success'): void => {
    void toast.create(message, { variant, duration: TOAST_PAUSE });
  };

  /*
   * A shadow root, because an inlined SVG's `<style>` is document-wide: the stats card emits
   * `.icon { display: none }` by default, which hid the site header's own theme-switcher icon.
   */
  const previewRoot = preview.attachShadow({ mode: 'open' });

  // Kept rather than read back: the DOM re-serialises what it parsed, so `innerHTML` never matches.
  let drawn = '';

  const [first] = CARDS;
  if (first === undefined) {
    throw new Error('No cards to draw');
  }
  let state = freshState(first, '');
  // Node's types reach this project too, so the handle's type is taken from the call.
  let pending: ReturnType<typeof globalThis.setTimeout> | undefined;

  /** The saved-card file the current state stands for. */
  const savedCard = (): string =>
    `${JSON.stringify({ card: state.card.id, options: toQuery(state) }, undefined, 2)}\n`;

  /** Draws the card, and writes the file beside it. */
  const redraw = async (): Promise<void> => {
    const file = savedCard();
    output.textContent = file;
    download.href = URL.createObjectURL(new Blob([file], { type: 'application/json' }));

    const result = await renderSampleCard(state.card.id, toQuery(state));
    // The wrapper gives the drawn card a stable handle: a card's icons are `<svg>` too.
    const next = `<div class="anvil-card">${result.content}</div>`;

    /*
     * Only when it differs. A recording is keyed by what a request asks, not who it asks for, so
     * typing a username replaced a card with its twin — which reads as "the numbers are yours now".
     */
    if (next !== drawn) {
      drawn = next;
      previewRoot.innerHTML = next;
    }

    if (result.status === 'error') {
      status.textContent = `${result.error.message} ${result.error.secondaryMessage}`.trim();
      status.dataset['state'] = 'error';
    } else {
      // The badge beneath carries the standing caveat; saying it twice filled the space below.
      status.textContent = '';
      status.dataset['state'] = 'ok';
    }
  };

  /** Swallows nothing: a thrown render is a bug in the page, not a rejected option. */
  const schedule = (): void => {
    void redraw();
  };

  /** @returns The control for one option, or nothing for the ones the anvil draws itself. */
  const control = (option: CardOption): Array<HTMLElement> => {
    const { name, label, kind, choices, hint } = option;

    if (name === OWN_CONTROL) {
      return [];
    }

    if (kind === 'boolean') {
      return [
        createTriState({
          label,
          option: name,
          hint,
          value: state.values[name] ?? '',
          onPick: (value) => {
            state.values[name] = value;
            schedule();
          },
        }),
      ];
    }

    if (choices !== undefined && kind === 'choice') {
      return [
        createSelect({
          label,
          option: name,
          values: choices,
          value: state.values[name] ?? '',
          onPick: (value) => {
            state.values[name] = value;
            schedule();
          },
        }),
      ];
    }

    if (isMultiValued(option)) {
      const picked = state.lists[name];
      return picked === undefined
        ? []
        : [
            createCheckGroup({
              label,
              option: name,
              values: choices ?? [],
              picked,
              onToggle: schedule,
            }),
          ];
    }

    // Everything left writes one string: a number, a free-text value, or a list with no closed set.
    return [
      createTextField({
        label,
        option: name,
        hint: kind === 'list' ? (hint ?? 'Comma separated') : hint,
        numeric: kind === 'number',
        value: state.values[name] ?? '',
        onInput: (value) => {
          state.values[name] = value;
          schedule();
        },
      }),
    ];
  };

  /** Rebuilds the controls for the current card. */
  const buildControls = (): void => {
    const own = state.card.options.filter((option) => !SHARED_OPTIONS.has(option.name));
    const shared = state.card.options.filter((option) => SHARED_OPTIONS.has(option.name));

    controls.replaceChildren(
      ...state.card.required.flatMap((option) => control(option)),
      createNote(
        'These go into the saved file, so the card renders as yours. The preview draws the recorded account whatever you type.',
      ),
      createSelect({
        label: 'Theme',
        option: 'theme',
        // Only the half of each theme pair this card wears, grouped by the background it implies.
        values: themeGroups(state.card.category),
        value: state.theme,
        swatches: true,
        onPick: (value) => {
          state.theme = value;
          schedule();
        },
      }),
      ...own.flatMap((option) => control(option)),
      createSection(
        'Colors and border',
        shared.flatMap((option) => control(option)),
      ),
    );
  };

  const extra = createTextField({
    label: 'Anything else',
    option: 'extra',
    placeholder: 'cache_seconds=1800',
    hint: 'A query string, for anything not above',
    onInput: (value) => {
      state.extra = value;
      globalThis.clearTimeout(pending);
      pending = globalThis.setTimeout(schedule, TYPING_PAUSE);
    },
  });
  extraHost.replaceChildren(extra);

  const picker = createSelect({
    label: 'Card',
    option: 'card',
    // Grouped by what each card is about, the way the theme picker groups by background.
    values: CARD_GROUPS,
    value: first.id,
    includeDefault: false,
    onPick: (value) => {
      const card = findCard(value);
      if (card === undefined) {
        return;
      }
      state = freshState(card, state.theme);
      extra.value = '';
      state.extra = '';
      cardDocs.href = `${BASE}/docs/cards/${card.docs}/`;
      buildControls();
      schedule();
    },
  });
  cardPicker.replaceChildren(picker);

  copy.addEventListener('click', () => {
    void navigator.clipboard.writeText(savedCard()).then(
      () => {
        notify('card.json copied to the clipboard');
      },
      () => {
        notify('The browser would not give access to the clipboard', 'danger');
      },
    );
  });

  download.addEventListener('click', () => {
    notify('Saving card.json');
  });

  buildControls();
  schedule();
};

export { mount };
