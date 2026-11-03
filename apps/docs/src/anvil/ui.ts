/**
 * @file The anvil's controls, and what they redraw.
 *
 * Every list a control offers is read from core — `themes`, and each card's own `OPTIONS` — so the
 * page cannot offer a value the schema would reject. What core has no list for is reached through
 * the query box, which is the same string the CLI's `--config` file holds.
 */

import type WaToast from '@awesome.me/webawesome/dist/components/toast/toast.js';
import {
  cardFileStem,
  cardSubject,
  numericStep,
  OPTION_GROUPS,
  savedCardText,
} from '@stats-forge/github-stats-forge-catalog';
import type { CardField } from '@stats-forge/github-stats-forge-catalog';
import { DEFAULT_THEME, queryOf } from '@stats-forge/github-stats-forge-core/api';

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

/** The anvil draws the theme itself, as two pickers with swatches: one for both modes, one for dark. */
const OWN_CONTROL = 'theme';

/** The section the theme pickers join. It opens under the card's subject; the rest open folded. */
const THEME_GROUP = 'colors';

/** How long to wait after a keystroke before redrawing. */
const TYPING_PAUSE = 250;

/** How long a toast stays up. */
const TOAST_PAUSE = 3000;

/**
 * How long a draw may take before the preview says it is waiting.
 *
 * Held back rather than shown at once, and timed rather than asked of the source: a sample draw
 * finishes in a few milliseconds and so would only ever flicker, while an instance's cache hit is
 * nearly as quick and its GitHub call is not. What earns a spinner is a draw that is *taking* a
 * while, whoever started it.
 */
const BUSY_PAUSE = 200;

/** A card's dark block, which the preview answers for the ground rather than the browser. */
const DARK_SCHEME_QUERY = '@media (prefers-color-scheme: dark)';

/** @returns The card's markup with its dark block on or off, as a viewer on `ground` sees it. */
const asSeenOn = (svg: string, ground: Backdrop): string => {
  if (ground === 'dark') {
    return svg.replaceAll(DARK_SCHEME_QUERY, '@media all');
  }
  return svg.replaceAll(DARK_SCHEME_QUERY, '@media not all');
};

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
  /** Dark mode's own theme, the second of a `light,dark` pair; empty when it follows `theme`. */
  themeDark: string;
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

/** The light half of the default pair, worn when only dark mode is picked. */
const [DEFAULT_LIGHT_THEME = ''] = DEFAULT_THEME.split(',');

/** @returns The `theme` param: one name, or a `light,dark` pair once dark mode has its own. */
const themeParam = ({ theme, themeDark }: State): string => {
  if (themeDark === '') {
    return theme;
  }
  return `${theme === '' ? DEFAULT_LIGHT_THEME : theme},${themeDark}`;
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

  const theme = themeParam(state);
  if (theme !== '') {
    query['theme'] = theme;
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

  for (const [name, value] of Object.entries(
    queryOf(new URLSearchParams(state.extra.replace(/^\?/, ''))),
  )) {
    if (name !== '') {
      query[name] = value;
    }
  }

  return query;
};

/** @returns The saved file's name, which is also what the `--config` line beneath it says. */
const fileName = (state: State): string => `${cardFileStem(state.card, state.values)}-config.json`;

/** @returns The command that renders the saved file. */
const command = (name: string): string =>
  `npx @stats-forge/github-stats-forge-cli --config ${name} --generate`;

/**
 * With an alt text, because whoever pastes the line will not stop to write one.
 *
 * @returns The markdown that puts the card in a README.
 */
const markdown = (state: State, url: string): string => {
  const subject = cardSubject(state.card, state.values);
  return `![${subject === '' ? state.card.id : `${subject} ${state.card.id}`}](${url})`;
};

/** @returns A fresh state for that card, keeping nothing from the last one but the theme. */
const freshState = (
  card: AnvilCard,
  { theme, themeDark }: Pick<State, 'theme' | 'themeDark'>,
): State => ({
  card,
  // Seeded with the sampled identity, so the file is valid and the card draws before anything is typed.
  values: { ...card.identity },
  lists: Object.fromEntries(
    card.options.filter(isMultiValued).map((option) => [option.name, new Set<string>()]),
  ),
  theme,
  themeDark,
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
  /** The last card drawn, before `asSeenOn`, so a change of ground repaints it without a redraw. */
  let drawnCard = '';

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

  /*
   * Only when it differs. The fixtures answer what a request asks, not who it asks for, so
   * typing a username replaced a card with its twin — read as "the numbers are yours now".
   */
  const paint = (): void => {
    // The wrapper gives the drawn card a stable handle: a card's icons are `<svg>` too.
    const next = `<div class="anvil-card">${asSeenOn(drawnCard, backdrop)}</div>`;
    if (next !== drawn) {
      drawn = next;
      previewRoot.innerHTML = next;
    }
  };

  const setBackdrop = (ground: Backdrop): void => {
    backdrop = ground;
    frame.dataset['backdrop'] = ground;
    paint();
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
  let state = freshState(first, { theme: '', themeDark: '' });
  // Node's types reach this project too, so the handle's type is taken from the call.
  let pending: ReturnType<typeof globalThis.setTimeout> | undefined;

  const darkScheme = globalThis.matchMedia('(prefers-color-scheme: dark)');

  /** @returns The ground matching the browser's color scheme. */
  const schemeGround = (): Backdrop => {
    if (darkScheme.matches) {
      return 'dark';
    }
    return 'light';
  };

  // the theme the ground last followed: another option changing leaves a chosen ground alone
  let followedTheme: string | undefined;

  /** Puts the ground the card's own background asks for under it, and holds still where it asks none. */
  const followBackdrop = ({ force = false }: { force?: boolean } = {}): void => {
    const query = toQuery(state);
    const theme = query['theme'] ?? '';
    if (!force && theme === followedTheme) {
      return;
    }
    followedTheme = theme;
    const implied = backdropFor(query);
    if (implied === undefined) {
      return;
    }
    const ground = implied === 'browser' ? schemeGround() : implied;
    if (ground === backdrop) {
      return;
    }
    setBackdrop(ground);
    backdropBar.value = ground;
  };
  // A card carrying both schemes starts on the browser's, as a visitor's README would.
  darkScheme.addEventListener('change', () => {
    // a single theme's ground is the scheme's no more than before, so one chosen by hand holds
    if (backdropFor(toQuery(state)) === 'browser') {
      followBackdrop({ force: true });
    }
  });

  // written onto the root by `anvil.astro`, this file having no environment to read
  const servedByInstance = root.dataset['source'] === 'server';
  const sources: Array<PreviewSource> = servedByInstance
    ? [serverSource, sampleSource]
    : [sampleSource];
  let source: PreviewSource = servedByInstance ? serverSource : sampleSource;

  /** The saved-card file the current state stands for. */
  const savedCard = (): string => savedCardText(state.card, toQuery(state));

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
      drawnCard = shown.content;
      paint();
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
    // Never debounced either: a half-typed theme names no ground, so nothing moves until one does.
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
    const themePickers = [
      createSelect({
        label: 'Theme',
        option: 'theme',
        values: themeGroups(),
        value: state.theme,
        swatches: true,
        hint: 'Worn in both modes, unless dark mode has its own',
        onPick: (value) => {
          state.theme = value;
          schedule();
        },
      }),
      createSelect({
        label: 'Dark mode',
        option: 'theme-dark',
        values: themeGroups(),
        value: state.themeDark,
        swatches: true,
        defaultLabel: 'as the theme',
        hint: 'Worn instead when the viewer is in dark mode',
        onPick: (value) => {
          state.themeDark = value;
          schedule();
        },
      }),
    ];

    // The CLI's sections from the same table, the theme's first; an empty one is dropped.
    const sections = OPTION_GROUPS.toSorted(
      (a, b) => Number(b.group === THEME_GROUP) - Number(a.group === THEME_GROUP),
    ).flatMap(({ group, label }) => {
      const built = state.card.options
        .filter((option) => option.group === group)
        .flatMap((option) => control(option));
      const contents = group === THEME_GROUP ? [...themePickers, ...built] : built;
      return contents.length === 0 ? [] : [createSection(label, contents, group === THEME_GROUP)];
    });

    controls.replaceChildren(
      createSection(
        'What it draws',
        [
          ...state.card.required.flatMap((option) => control(option)),
          createNote(source.identityNote),
        ],
        true,
      ),
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
      state = freshState(card, state);
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
