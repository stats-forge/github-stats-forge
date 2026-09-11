/**
 * @file The anvil's controls, and what they redraw.
 *
 * Every list a control offers is read from core — `themes`, and each card's own `OPTIONS` — so the
 * page cannot offer a value the schema would reject. What core has no list for is reached through
 * the query box, which is the same string the CLI's `--config` file holds.
 */

import type WaToast from '@awesome.me/webawesome/dist/components/toast/toast.js';
import { numericStep, OPTION_GROUPS } from '@stats-forge/github-stats-forge-cli/cards';
import type { CardField } from '@stats-forge/github-stats-forge-cli/cards';

import { CARD_GROUPS, CARDS, findCard } from './cards.ts';
import type { AnvilCard } from './cards.ts';
import {
  createCheckGroup,
  createNote,
  createSection,
  createSegments,
  createSelect,
  createTextField,
  createTriState,
} from './controls.ts';
import { cardUrl, sampleSource, serverSource } from './source.ts';
import type { PreviewSource } from './source.ts';
import { backdropFor, themeGroups } from './themes.ts';
import type { Backdrop } from './themes.ts';

/**
 * Astro's own base rather than `constants.ts`'s `BASE`, which reads an environment this file,
 * running in a browser, has none of.
 *
 * @returns The base path, empty when the site is served at the root.
 */
const basePath = (): string => import.meta.env.BASE_URL.replace(/\/$/, '');

/** The anvil draws the theme itself, with swatches and only the half of each pair the card wears. */
const OWN_CONTROL = 'theme';

/** The one section that opens folded: its options are shared by every card and rarely the point. */
const FOLDED_GROUP = 'colors';

/** How long to wait after a keystroke before redrawing. */
const TYPING_PAUSE = 250;

/** How long a toast stays up. */
const TOAST_PAUSE = 3000;

/**
 * How long a draw may take before the preview says it is waiting.
 *
 * Held back rather than shown at once, and timed rather than asked of the source: a recording
 * finishes in a few milliseconds and so would only ever flicker, while an instance's cache hit is
 * nearly as quick and its GitHub call is not. What earns a spinner is a draw that is *taking* a
 * while, whoever started it.
 */
const BUSY_PAUSE = 200;

/** The two grounds a card can be previewed on, and the word on each segment. */
const BACKDROPS: ReadonlyArray<readonly [Backdrop, string]> = [
  ['light', 'Light'],
  ['dark', 'Dark'],
];

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
const isMultiValued = (option: CardField): boolean =>
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

/**
 * The **last** of the card's required params, so a pin is named after the repository rather than
 * its owner.
 *
 * @returns What the card is about, or `''` when the field has been emptied.
 */
const subjectOf = (state: State): string => {
  const subject = state.card.required.at(-1);
  return subject === undefined ? '' : (state.values[subject.name] ?? '');
};

/**
 * Anything a file system reads specially is dropped from the subject.
 *
 * @returns The file name, which is also what the `--config` line beneath the file says.
 */
const fileName = (state: State): string => {
  const typed = subjectOf(state);
  const slug = typed.replaceAll(/[^\w.-]+/g, '-').replaceAll(/^[.-]+|[.-]+$/g, '');
  return slug === '' ? `${state.card.id}-config.json` : `${slug}-${state.card.id}-config.json`;
};

/** @returns The command that renders the saved file. */
const command = (name: string): string =>
  `npx @stats-forge/github-stats-forge-cli --config ${name} --generate`;

/**
 * With an alt text, because whoever pastes the line will not stop to write one.
 *
 * @returns The markdown that puts the card in a README.
 */
const markdown = (state: State, url: string): string => {
  const subject = subjectOf(state);
  return `![${subject === '' ? state.card.id : `${subject} ${state.card.id}`}](${url})`;
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
  const sourcePicker = need(root, '[data-anvil="source"]');
  const sourceBadge = need(root, '[data-anvil="source-badge"]');
  const sourceAside = need(root, '[data-anvil="source-aside"]');
  const sourceDetail = need(root, '[data-anvil="source-detail"]');
  const cardPicker = need(root, '[data-anvil="card"]');
  const controls = need(root, '[data-anvil="controls"]');
  const extraHost = need(root, '[data-anvil="extra"]');
  const frame = need(root, '[data-anvil="frame"]');
  const preview = need(root, '[data-anvil="preview"]');
  const backdropHost = need(root, '[data-anvil="backdrop"]');
  const status = need(root, '[data-anvil="status"]');
  const output = need(root, '[data-anvil="output"]');
  const download = need(root, '[data-anvil="download"]') as HTMLAnchorElement;
  const fileLabel = need(root, '[data-anvil="filename"]');
  const commandLine = need(root, '[data-anvil="command"]');
  const copy = need(root, '[data-anvil="copy"]') as HTMLButtonElement;
  const urlPanel = need(root, '[data-anvil="url-panel"]');
  const urlLine = need(root, '[data-anvil="url"]');
  const markdownLine = need(root, '[data-anvil="markdown"]');
  const copyUrl = need(root, '[data-anvil="copy-url"]') as HTMLButtonElement;
  const copyMarkdown = need(root, '[data-anvil="copy-markdown"]') as HTMLButtonElement;
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

  /**
   * The frame carries the state and the stylesheet draws it — a scrim over the card, not in place
   * of it, the card that is up being still the answer to the question before last.
   */
  const showBusy = (waiting: boolean): void => {
    if (waiting) {
      frame.dataset['busy'] = '';
    } else {
      delete frame.dataset['busy'];
    }
    frame.ariaBusy = waiting ? 'true' : null;
  };

  /**
   * Which ground the preview shows. Held rather than derived on every draw: a translucent theme
   * implies neither, and there whichever ground is showing is the one to leave showing.
   */
  let backdrop: Backdrop = 'light';

  const setBackdrop = (ground: Backdrop): void => {
    backdrop = ground;
    frame.dataset['backdrop'] = ground;
  };

  const backdropBar = createSegments({
    label: 'Preview backdrop',
    values: BACKDROPS,
    value: backdrop,
    onPick: (value) => {
      setBackdrop(value === 'dark' ? 'dark' : 'light');
    },
  });
  // No `data-option`: it is the one control here that writes nothing into the card.
  backdropBar.className = 'anvil-backdrop';
  backdropHost.replaceChildren(backdropBar);

  const [first] = CARDS;
  if (first === undefined) {
    throw new Error('No cards to draw');
  }
  let state = freshState(first, '');
  // Node's types reach this project too, so the handle's type is taken from the call.
  let pending: ReturnType<typeof globalThis.setTimeout> | undefined;

  /** Puts the ground the card's own background asks for under it, and holds still where it asks none. */
  const followBackdrop = (): void => {
    const implied = backdropFor(toQuery(state), state.card.category);
    if (implied === undefined || implied === backdrop) {
      return;
    }
    setBackdrop(implied);
    backdropBar.value = implied;
  };

  // written onto the root by `anvil.astro`, this file having no environment to read
  const servedByInstance = root.dataset['source'] === 'server';
  const sources: Array<PreviewSource> = servedByInstance
    ? [serverSource, sampleSource]
    : [sampleSource];
  let source: PreviewSource = servedByInstance ? serverSource : sampleSource;

  /** The saved-card file the current state stands for. */
  const savedCard = (): string =>
    `${JSON.stringify({ card: state.card.id, options: toQuery(state) }, undefined, 2)}\n`;

  /** Writes the file beside the card. Never debounced: it is what a copy button reads. */
  const writeFile = (): void => {
    const file = savedCard();
    const name = fileName(state);
    output.textContent = file;
    fileLabel.textContent = name;
    commandLine.textContent = command(name);
    download.download = name;
    // revoked first: this runs per keystroke, and an orphaned blob lives as long as the page
    if (download.href.startsWith('blob:')) {
      URL.revokeObjectURL(download.href);
    }
    download.href = URL.createObjectURL(new Blob([file], { type: 'application/json' }));

    if (servedByInstance) {
      const url = cardUrl(state.card.id, toQuery(state));
      urlLine.textContent = url;
      markdownLine.textContent = markdown(state, url);
    }
  };

  /** Which draw is the latest; an instance answers a cache hit faster than a miss started before it. */
  let sequence = 0;
  let busyHold: ReturnType<typeof globalThis.setTimeout> | undefined;

  /** Draws the card from whichever source is chosen. */
  const draw = async (): Promise<void> => {
    sequence += 1;
    const own = sequence;

    globalThis.clearTimeout(busyHold);
    busyHold = globalThis.setTimeout(() => {
      showBusy(true);
    }, BUSY_PAUSE);

    const shown = await source.draw(state.card.id, toQuery(state));
    if (own !== sequence) {
      // a newer draw is what the controls now describe, and it owns the indicator too
      return;
    }

    globalThis.clearTimeout(busyHold);
    showBusy(false);

    if (shown.content !== undefined) {
      // The wrapper gives the drawn card a stable handle: a card's icons are `<svg>` too.
      const next = `<div class="anvil-card">${shown.content}</div>`;

      /*
       * Only when it differs. A recording is keyed by what a request asks, not who it asks for, so
       * typing a username replaced a card with its twin — read as "the numbers are yours now".
       */
      if (next !== drawn) {
        drawn = next;
        previewRoot.innerHTML = next;
      }
    }

    // The badge beneath carries the standing caveat; saying it twice filled the space below.
    status.textContent = shown.problem ?? '';
    status.dataset['state'] = shown.problem === undefined ? 'ok' : 'error';
  };

  /** Swallows nothing: a thrown render is a bug in the page, not a rejected option. */
  const schedule = (): void => {
    writeFile();
    followBackdrop();
    globalThis.clearTimeout(pending);
    void draw();
  };

  /** The same, once typing has stopped: on an instance every redraw is a request against its token. */
  const scheduleTyping = (): void => {
    writeFile();
    // Never debounced either: a half-typed hex names no ground, so nothing moves until one does.
    followBackdrop();
    globalThis.clearTimeout(pending);
    pending = globalThis.setTimeout(() => {
      void draw();
    }, TYPING_PAUSE);
  };

  /** @returns The control for one option, or nothing for the ones the anvil draws itself. */
  const control = (option: CardField): Array<HTMLElement> => {
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
        step: numericStep(kind),
        value: state.values[name] ?? '',
        onInput: (value) => {
          state.values[name] = value;
          scheduleTyping();
        },
      }),
    ];
  };

  /** Rebuilds the controls for the current card. */
  const buildControls = (): void => {
    // The CLI's sections, in its order; a group none of this card's options sit under is dropped.
    const sections = OPTION_GROUPS.flatMap(({ group, label }) => {
      const options = state.card.options.filter((option) => option.group === group);
      const built = options.flatMap((option) => control(option));
      return built.length === 0 ? [] : [createSection(label, built, group !== FOLDED_GROUP)];
    });

    controls.replaceChildren(
      ...state.card.required.flatMap((option) => control(option)),
      createNote(source.identityNote),
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
      ...sections,
    );
  };

  const extra = createTextField({
    label: 'Anything else',
    option: 'extra',
    placeholder: 'cache_seconds=1800',
    hint: 'A query string, for anything not above',
    onInput: (value) => {
      state.extra = value;
      scheduleTyping();
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
      cardDocs.href = `${basePath()}/docs/cards/${card.docs}/`;
      buildControls();
      schedule();
    },
  });
  cardPicker.replaceChildren(picker);

  /** Reports through a toast, so no button retitles itself. */
  const copyToClipboard = async (text: string, what: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      notify('The browser would not give access to the clipboard', 'danger');
      return;
    }
    notify(`${what} copied to the clipboard`);
  };

  copy.addEventListener('click', () => {
    void copyToClipboard(savedCard(), fileName(state));
  });

  download.addEventListener('click', () => {
    notify(`Saving ${fileName(state)}`);
  });

  urlPanel.hidden = !servedByInstance;

  copyUrl.addEventListener('click', () => {
    void copyToClipboard(cardUrl(state.card.id, toQuery(state)), 'Card URL');
  });

  copyMarkdown.addEventListener('click', () => {
    void copyToClipboard(markdown(state, cardUrl(state.card.id, toQuery(state))), 'Markdown');
  });

  const showSource = (): void => {
    sourceBadge.textContent = source.badge;
    sourceAside.textContent = source.aside;
    sourceDetail.textContent = source.detail;
  };

  // only where there is a choice
  if (sources.length > 1) {
    sourcePicker.replaceChildren(
      createSelect({
        label: 'Preview from',
        option: 'source',
        values: sources.map((candidate) => candidate.label),
        value: source.label,
        includeDefault: false,
        onPick: (value) => {
          source = sources.find((candidate) => candidate.label === value) ?? source;
          showSource();
          buildControls();
          schedule();
        },
      }),
    );
  }

  showSource();
  buildControls();
  schedule();
};

export { mount };
