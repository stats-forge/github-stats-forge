/**
 * @file What the anvil has to keep doing.
 *
 * Every assertion here is one the other checks cannot make: they run in Node, and this is about
 * the page — which control redraws what, and what the browser is asked for while it happens.
 */

import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/** In the preview's shadow root. The wrapper makes it selectable: a card's icons are `<svg>` too. */
const drawnCard = (page: Page): Locator => page.locator('[data-anvil="preview"] .anvil-card > svg');

/** A saved card, as the page writes it out and as the CLI's `--config` reads it. */
interface SavedCard {
  card: string;
  options: Record<string, string>;
}

/** The saved-card file the page is offering. */
const savedCard = async (page: Page): Promise<SavedCard> => {
  const text = await page.locator('[data-anvil="output"]').textContent();
  return JSON.parse((text ?? '').trim()) as SavedCard;
};

/** Seeded on every card, so a test about what a control wrote asserts without them. */
const IDENTITY_PARAMS = new Set(['username', 'repo', 'id']);

/** @returns One param of the saved card, so it can be polled while the page catches up. */
const savedParam = async (page: Page, name: string): Promise<string | undefined> => {
  const saved = await savedCard(page);
  return saved.options[name];
};

/** @returns The saved options, minus the identity every card carries. */
const chosen = (saved: SavedCard): Record<string, string> =>
  Object.fromEntries(Object.entries(saved.options).filter(([name]) => !IDENTITY_PARAMS.has(name)));

/** By `data-option`: Web Awesome's `label` is a Lit property and is not reflected. */
const dropdown = (page: Page, option: string): Locator =>
  page.locator(`wa-select[data-option="${option}"]`);

/** Opens a dropdown and picks a value, as a click would. */
const pick = async (page: Page, option: string, value: string): Promise<void> => {
  const select = dropdown(page, option);

  /*
   * Opened through the property, because picks in a row race the popup's closing animation. The
   * selection is still a real click, and the swatch test covers opening it by click.
   */
  await select.evaluate((element) => {
    (element as HTMLElement & { open: boolean }).open = true;
  });

  await select.locator(`wa-option[value="${value}"]`).click();
};

/**
 * Sets a dropdown without opening it: picks in a row race the panel's closing animation, and a
 * card pick replaces the controls beneath it so the pane reflows mid-click. The tests that cycle
 * through values are about what each one changes, not about the picker — which `pick` covers.
 */
const setDropdown = async (page: Page, option: string, value: string): Promise<void> => {
  await dropdown(page, option).evaluate((element, picked) => {
    const select = element as HTMLElement & { value: string };
    select.value = picked;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
};

/** Switches card, which is the pick that reflows the whole pane. */
const setCard = (page: Page, id: string): Promise<void> => setDropdown(page, 'card', id);

/** The query box, which is the native input inside the Web Awesome field. */
const queryBox = (page: Page): Locator => page.locator('wa-input[data-option="extra"] input');

/** The field that writes one query param, by the param's own name. */
const field = (page: Page, option: string): Locator =>
  page.locator(`wa-input[data-option="${option}"] input`);

/** The three-way boolean that writes one query param, by the param's own name. */
const triState = (page: Page, option: string): Locator =>
  page.locator(`wa-radio-group[data-option="${option}"]`);

/** `min-height: 16rem` on the frame, in pixels: the box a card is centred in, whatever its height. */
const MIN_FRAME = 256;

/** The frame the card is drawn in: it carries which ground is showing, and whether a draw is late. */
const previewFrame = (page: Page): Locator => page.locator('[data-anvil="frame"]');

/** The preview's own control — which ground the card is stood on. It writes no card option. */
const backdropBar = (page: Page): Locator => page.locator('wa-radio-group.anvil-backdrop');

/** Sets a tri-state boolean. */
const setBoolean = async (page: Page, option: string, state: string): Promise<void> => {
  await triState(page, option).locator(`wa-radio[value="${state}"]`).click();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/anvil/');
  await expect(drawnCard(page)).toBeVisible();
});

test('shows what each theme looks like beside its name', async ({ page }) => {
  const themeSelect = dropdown(page, 'theme');
  await themeSelect.click();

  // The swatch is a miniature of the card: the theme's background, and its three text colors.
  const swatch = themeSelect.locator('wa-option[value="tokyonight"] .anvil-swatch');
  await expect(swatch).toBeVisible();
  await expect(swatch.locator('i')).toHaveCount(3);
});

test('offers only the half of each theme pair the card wears', async ({ page }) => {
  const values = (): Promise<Array<string>> =>
    dropdown(page, 'theme')
      .locator('wa-option')
      .evaluateAll((rows) => rows.map((row) => (row as HTMLElement & { value: string }).value));

  // Stats describes a user, so it gets the plain half.
  const userThemes = await values();
  expect(userThemes).toContain('default');
  expect(userThemes.filter((name) => name.endsWith('_repocard'))).toEqual([]);

  // The gist card describes one gist, so it gets the `_repocard` half of every pair.
  await setCard(page, 'gist');
  const repoThemes = await values();
  expect(repoThemes).toContain('default_repocard');
  expect(repoThemes).not.toContain('default');
});

test('groups the themes by the background each implies', async ({ page }) => {
  const headings = dropdown(page, 'theme').locator('.anvil-option-group');

  await expect(headings).toHaveText(['Light', 'Either', 'Dark']);
});

test('groups the cards by what each one describes', async ({ page }) => {
  const picker = dropdown(page, 'card');

  await expect(picker.locator('.anvil-option-group')).toHaveText([
    'User',
    'Repository or gist',
    'Organization',
  ]);

  // A card sits under its own heading rather than in the order the catalog lists them.
  const rows = picker.locator('wa-option');
  await expect(rows).toHaveText([
    'stats',
    'top-langs',
    'contributed-to',
    'wakatime',
    'pin',
    'gist',
    'org',
  ]);
});

test('draws a card on arrival, with no card chosen', async ({ page }) => {
  await expect(drawnCard(page)).toHaveAttribute('width', '500');
  await expect(page.locator('[data-anvil="status"]')).toHaveAttribute('data-state', 'ok');

  const saved = await savedCard(page);
  expect(saved.card).toBe('stats');
  expect(chosen(saved)).toEqual({});
});

test('sends nothing anywhere while drawing every card', async ({ page }) => {
  // the claim is the recording's, so state which source is drawing before asserting it
  await expect(page.locator('[data-anvil="root"]')).toHaveAttribute('data-source', 'sample');
  await expect(page.locator('wa-select[data-option="source"]')).toHaveCount(0);

  // By origin, taken once: a URL prefix counted the site's own `/_astro/` chunks as offsite.
  const { origin } = new URL(page.url());
  const sent: Array<string> = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    // an instance's cards are same-origin, which the origin check alone would miss
    if (url.origin !== origin || url.pathname.startsWith('/api/')) {
      sent.push(request.url());
    }
  });

  for (const card of ['top-langs', 'pin', 'org', 'contributed-to', 'gist', 'wakatime']) {
    await setCard(page, card);
    await expect(drawnCard(page)).toBeVisible();
  }

  expect(sent).toEqual([]);
});

test('picking a card rebuilds its controls and redraws it', async ({ page }) => {
  await expect(dropdown(page, 'rank_icon')).toBeVisible();

  await pick(page, 'card', 'top-langs');

  await expect(dropdown(page, 'rank_icon')).toBeHidden();
  await expect(dropdown(page, 'layout')).toBeVisible();
  await expect(drawnCard(page)).toHaveAttribute('width', '300');

  const saved = await savedCard(page);
  expect(saved.card).toBe('top-langs');
});

test('an option reaches the renderer', async ({ page }) => {
  await pick(page, 'card', 'top-langs');
  await expect(drawnCard(page)).toHaveAttribute('width', '300');

  await pick(page, 'layout', 'donut');

  // The donut layout takes the next width up, so the card itself says the option arrived.
  await expect(drawnCard(page)).toHaveAttribute('width', '400');

  const saved = await savedCard(page);
  expect(chosen(saved)).toEqual({ layout: 'donut' });
});

test('a chosen theme colors the card and survives a change of card', async ({ page }) => {
  await pick(page, 'theme', 'tokyonight');

  await expect(drawnCard(page).locator('rect').first()).toHaveAttribute('fill', '#1a1b27');

  await pick(page, 'card', 'gist');

  const saved = await savedCard(page);
  expect(chosen(saved)).toEqual({ theme: 'tokyonight' });
});

test('several values of one option are written as a list', async ({ page }) => {
  // By value, not by text: `prs_merged` is a substring of `prs_merged_percentage`.
  await page.locator('wa-checkbox[value="contributions"]').click();
  await page.locator('wa-checkbox[value="reviews"]').click();

  const saved = await savedCard(page);
  expect(chosen(saved)).toEqual({ show: 'contributions,reviews' });
  await expect(drawnCard(page)).toContainText('Total Contributions:');
});

test('the query box reaches the renderer', async ({ page }) => {
  await queryBox(page).fill('card_width=480&hide_title=true');

  await expect(drawnCard(page)).toHaveAttribute('width', '480');
  // The title group, not the card's text: the `<desc>` a screen reader gets still names the card.
  await expect(drawnCard(page).getByTestId('card-title')).toBeHidden();

  const saved = await savedCard(page);
  expect(chosen(saved)).toEqual({ card_width: '480', hide_title: 'true' });
});

test('offers every option the CLI asks for, not only the closed sets', async ({ page }) => {
  // The catalog is the CLI's own, so these are exactly the options its prompts walk.
  await expect(triState(page, 'show_icons')).toBeVisible();
  await expect(field(page, 'custom_title')).toBeVisible();
  await expect(field(page, 'card_width')).toBeVisible();

  // Sectioned as the CLI's menu is, from the same table; the colours fold away rather than go absent.
  // `summary` is a Lit property and not reflected, so the heading is found as the button it renders.
  const sections = page.locator('wa-details.anvil-section');
  await expect(sections).toHaveCount(4);
  await expect(sections.first()).toHaveAttribute('open', '');
  await expect(sections.last().getByRole('button', { name: 'Colors and border' })).toBeVisible();
  await expect(sections.last()).not.toHaveAttribute('open');
  await expect(field(page, 'title_color')).toBeAttached();

  await setCard(page, 'top-langs');
  await expect(field(page, 'langs_count')).toBeVisible();
});

test('a number field reaches the renderer', async ({ page }) => {
  await setCard(page, 'top-langs');
  await pick(page, 'layout', 'compact');

  await field(page, 'langs_count').fill('3');

  const saved = await savedCard(page);
  expect(chosen(saved)).toEqual({ layout: 'compact', langs_count: '3' });
  await expect(drawnCard(page).locator('[data-testid="lang-name"]')).toHaveCount(3);
});

test('a numeric field steps as coarsely as its param is read', async ({ page }) => {
  await setCard(page, 'top-langs');

  // core reads a count of languages with parseInt and the weight beside it with parseFloat
  await expect(field(page, 'langs_count')).toHaveAttribute('step', '1');
  await expect(field(page, 'size_weight')).toHaveAttribute('step', 'any');
  await expect(field(page, 'custom_title')).not.toHaveAttribute('step');
});

test('a boolean can be turned on, turned off, or left to the card', async ({ page }) => {
  // Nothing said: the option is absent from the file, so the card's own default stands.
  const untouched = await savedCard(page);
  expect(chosen(untouched)).toEqual({});

  await setBoolean(page, 'show_icons', 'true');
  const on = await savedCard(page);
  expect(chosen(on)).toEqual({ show_icons: 'true' });
  await expect(drawnCard(page).locator('.icon').first()).toBeAttached();

  // Off has to be writable, not absent: `text_bold` defaults to on, so a switch could not clear it.
  await setBoolean(page, 'text_bold', 'false');
  const off = await savedCard(page);
  expect(chosen(off)).toEqual({ show_icons: 'true', text_bold: 'false' });
  await expect(drawnCard(page).locator('.stat.bold')).toHaveCount(0);

  await setBoolean(page, 'text_bold', 'default');
  const back = await savedCard(page);
  expect(chosen(back)).toEqual({ show_icons: 'true' });
  await expect(drawnCard(page).locator('.stat.bold').first()).toBeAttached();
});

test("a boolean's three segments are one bar of equal parts", async ({ page }) => {
  // Slotted children are light-DOM siblings, so Starlight's 1rem sibling margin pushed `on` and
  // `off` down and the flex row stretched `default` to cover the gap.
  const boxes = await triState(page, 'show_icons')
    .locator('wa-radio')
    .evaluateAll((rows) =>
      rows.map((row) => {
        const { top, height, width } = row.getBoundingClientRect();
        return { top: Math.round(top), height: Math.round(height), width: Math.round(width) };
      }),
    );

  expect(boxes).toHaveLength(3);
  expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
  expect(new Set(boxes.map((box) => box.height)).size).toBe(1);
  expect(new Set(boxes.map((box) => box.width)).size).toBe(1);
});

test("a rejected option draws core's own error card, naming the parameter", async ({ page }) => {
  await queryBox(page).fill('border_radius=abc');

  // The status says what kind of failure in the anvil's words; the card carries core's own message.
  const status = page.locator('[data-anvil="status"]');
  await expect(status).toHaveAttribute('data-state', 'error');
  await expect(status).toContainText('"border_radius"');
  // The card is still drawn: the error is the card, not a broken page.
  await expect(drawnCard(page)).toBeVisible();
  await expect(drawnCard(page)).toContainText('Invalid number input for parameter "border_radius"');
});

test("a card's own styles stay inside the card", async ({ page }) => {
  // The stats card emits `.icon { display: none }` by default, which unscoped hid every `svg.icon`
  // on the page — the header's theme switcher among them.
  await expect(page.locator('header').locator('svg.icon').first()).toBeVisible();

  // And the reverse: the page's own stylesheet does not reach into the card.
  const cardStyles = page.locator('[data-anvil="preview"] .anvil-card style');
  await expect(cardStyles.first()).toBeAttached();
});

test('a link wrapped onto its own line keeps the space before it', async ({ page }) => {
  // Astro drops the line break rather than collapsing it to a space, so each of these read
  // "eachcard's own page" and "options tothe library" until an explicit `{' '}` was added.
  const notes = page.locator('.anvil-note');

  await expect(notes.filter({ hasText: 'A query string' })).toContainText(
    "and on the selected card's page",
  );
  await expect(notes.filter({ hasText: 'Render it with' })).toContainText('options to the library');
});

test('the required params are in the file, and the reader owns them', async ({ page }) => {
  // The file used to carry every option *except* this one, so it drew here and the CLI rejected it.
  await expect(field(page, 'username')).toHaveValue('marcalexiei');
  expect(await savedParam(page, 'username')).toBe('marcalexiei');

  await field(page, 'username').fill('octocat');
  await expect.poll(() => savedParam(page, 'username')).toBe('octocat');

  // And the preview is unmoved by it: a recording answers what a request asks, not who it asks for.
  await expect(drawnCard(page)).toBeVisible();
  await expect(drawnCard(page).getByTestId('card-title')).not.toContainText('octocat');
});

test('offers no card URL, there being no instance to answer one', async ({ page }) => {
  // the panel is in the markup on every build; `ui.ts` unhides it only under a server
  await expect(page.locator('[data-anvil="url-panel"]')).toBeHidden();
});

test('a card identified by more than one param gets a field for each', async ({ page }) => {
  await setCard(page, 'pin');

  await expect(field(page, 'username')).toHaveValue('marcalexiei');
  await expect(field(page, 'repo')).toHaveValue('eslint-zod');

  await field(page, 'repo').fill('github-stats-forge');
  await expect.poll(() => savedParam(page, 'repo')).toBe('github-stats-forge');
});

test('emptying a required param draws the error the CLI would report', async ({ page }) => {
  await field(page, 'username').fill('');

  const status = page.locator('[data-anvil="status"]');
  await expect(status).toHaveAttribute('data-state', 'error');
  await expect(status).toContainText('username');
  // The file drops it rather than writing an empty one, so it is invalid in the same way.
  expect(await savedParam(page, 'username')).toBeUndefined();
});

test('the source badge explains itself on hover', async ({ page }) => {
  // The badge is the visible half; the tooltip's text is in the DOM either way, so nothing
  // important is hover-only. The strings are the recording's, this build having no server.
  // By id, not by class: the backdrop carries a badge of its own.
  const badge = page.locator('#anvil-source');
  const tooltip = page.locator('wa-tooltip[for="anvil-source"]');

  await expect(badge).toBeVisible();
  await expect(badge).toContainText('Mock data');
  await expect(tooltip).toContainText('nothing you type is sent anywhere');
  await expect(tooltip).toContainText('the numbers are always the sample');
  // The visible half stays one clause; the rest is what the tooltip is for.
  await expect(page.locator('.anvil-note').filter({ hasText: 'Mock data' })).toContainText(
    'the figures never move, whatever you type',
  );

  const isOpen = (): Promise<boolean> =>
    tooltip.evaluate((element) => (element as HTMLElement & { open: boolean }).open);

  expect(await isOpen()).toBe(false);
  await badge.hover();
  await expect.poll(isOpen).toBe(true);
});

test("the page's description is on the page, not only in its meta", async ({ page }) => {
  await expect(page.locator('.anvil-intro')).toHaveText(
    'Hammer a card into shape in the browser, and take away the file the CLI renders it from.',
  );
});

test('typing an identity param leaves the drawn card alone', async ({ page }) => {
  // Marked, then checked for the mark: replacing a card with its twin is invisible in a screenshot
  // but reads as "the numbers are yours now".
  await drawnCard(page).evaluate((element) => {
    element.dataset['marked'] = 'yes';
  });

  await field(page, 'username').fill('octocat');
  await expect.poll(() => savedParam(page, 'username')).toBe('octocat');
  await expect(drawnCard(page)).toHaveAttribute('data-marked', 'yes');

  // While an option that does change the card still replaces it.
  await pick(page, 'theme', 'dark');
  await expect(drawnCard(page)).not.toHaveAttribute('data-marked', 'yes');
});

test('the links out open in a new tab, so a half-built card survives', async ({ page }) => {
  const links = page.locator('.anvil-note a');

  await expect(links).toHaveCount(3);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener');
    await expect(link).toContainText('(opens in a new tab)');
  }
});

test("the page's own link follows the card that is selected", async ({ page }) => {
  const link = page.locator('[data-anvil="card-docs"]');

  // The pages are named for readers, so the href is not the card id: `pin` is `repo-pin`.
  await expect(link).toHaveAttribute('href', '/github-stats-forge/docs/cards/stats/');

  await setCard(page, 'pin');
  await expect(link).toHaveAttribute('href', '/github-stats-forge/docs/cards/repo-pin/');

  await setCard(page, 'top-langs');
  await expect(link).toHaveAttribute('href', '/github-stats-forge/docs/cards/top-languages/');
});

test('the download offers the bytes the page is showing', async ({ page }) => {
  await pick(page, 'theme', 'dark');

  const shown = (await page.locator('[data-anvil="output"]').textContent()) ?? '';
  // Read through the blob the anchor points at, which is rebuilt on every redraw.
  const offered = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>('[data-anvil="download"]');
    const response = await fetch(link?.href ?? '');
    return response.text();
  });

  expect(offered.trim()).toBe(shown.trim());
  expect(JSON.parse(offered) as unknown).toMatchObject({ card: 'stats' });
});

test('the copy button puts that same file on the clipboard', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  const copy = page.locator('[data-anvil="copy"]');
  const shown = (await page.locator('[data-anvil="output"]').textContent()) ?? '';

  await copy.click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.trim()).toBe(shown.trim());

  // The button keeps its name. It used to retitle itself to "Copied", which changes a control's
  // accessible name under whoever is using it; the toast is what reports the outcome now.
  await expect(copy).toHaveText('Copy');
});

test('both buttons report through a toast that is announced', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.locator('[data-anvil="copy"]').click();
  const copyToast = page.locator('wa-toast-item').filter({ hasText: 'copied to the clipboard' });
  await expect(copyToast).toBeVisible();

  /*
   * Web Awesome mirrors the text into a shared live region rather than putting `aria-live` on the
   * stack, so this is what proves a screen reader is told at all.
   */
  await expect(
    page.locator('[role="status"]').filter({ hasText: 'copied to the clipboard' }),
  ).toBeAttached();

  const download = page.waitForEvent('download');
  await page.locator('[data-anvil="download"]').click();
  await download;
  await expect(
    page.locator('wa-toast-item').filter({ hasText: 'Saving marcalexiei-stats-config.json' }),
  ).toBeVisible();
});

test("the toast's close button stays visible while hovered", async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('[data-anvil="copy"]').click();

  const item = page.locator('wa-toast-item').first();
  await item.waitFor();

  const closeColor = (): Promise<string> =>
    item.evaluate((element) => {
      const button = element.shadowRoot?.querySelector('[part~="close-button"]');
      return button === null || button === undefined ? '' : getComputedStyle(button).color;
    });

  /*
   * The component's own hover colour resolves against Web Awesome's light palette and comes out
   * near-black — invisible on a dark toast. At rest it follows the page, so hover has to match it.
   */
  const rest = await closeColor();
  const box = await item.boundingBox();
  await page.mouse.move(
    (box?.x ?? 0) + (box?.width ?? 0) - 24,
    (box?.y ?? 0) + (box?.height ?? 0) / 2,
  );
  await expect.poll(closeColor).toBe(rest);
});

test('fixing a rejected option clears the error and draws the card again', async ({ page }) => {
  const status = page.locator('[data-anvil="status"]');

  await queryBox(page).fill('border_radius=abc');
  await expect(status).toHaveAttribute('data-state', 'error');

  await queryBox(page).fill('');

  /*
   * A successful draw says nothing, and `:empty` hides the line — so a stale error would be both
   * visible and wrong. This is the assertion that the empty-on-success path really empties.
   */
  await expect(status).toHaveAttribute('data-state', 'ok');
  await expect(status).toBeHidden();
  await expect(drawnCard(page)).toHaveAttribute('width', '500');
});

test('the query box wins over a control for the same option', async ({ page }) => {
  await pick(page, 'theme', 'tokyonight');
  await expect(drawnCard(page).locator('rect').first()).toHaveAttribute('fill', '#1a1b27');

  // `toQuery` folds the box in last, so it overrides. Radical, not tokyonight.
  await queryBox(page).fill('theme=radical');

  await expect(drawnCard(page).locator('rect').first()).toHaveAttribute('fill', '#141321');
  const saved = await savedCard(page);
  expect(chosen(saved)).toEqual({ theme: 'radical' });
});

test('the closed theme select shows the theme it is set to', async ({ page }) => {
  const select = dropdown(page, 'theme');
  const onSelect = select.locator(':scope > .anvil-swatch');

  // Nothing to mirror while the card's own default stands.
  await expect(onSelect).toHaveCount(0);

  await pick(page, 'theme', 'tokyonight');
  await expect(onSelect).toHaveCount(1);
  await expect(onSelect.locator('i')).toHaveCount(3);
});

test('the source badge is reachable by keyboard', async ({ page }) => {
  const tooltip = page.locator('wa-tooltip[for="anvil-source"]');
  const isOpen = (): Promise<boolean> =>
    tooltip.evaluate((element) => (element as HTMLElement & { open: boolean }).open);

  // `tabindex="0"` on the badge exists for exactly this: the detail cannot be hover-only.
  await page.locator('#anvil-source').focus();
  await expect.poll(isOpen).toBe(true);
});

test('the file on offer is the file the CLI reads', async ({ page }) => {
  await pick(page, 'theme', 'dark');
  await pick(page, 'rank_icon', 'percentile');

  const saved = await savedCard(page);
  expect(saved).toEqual({
    card: 'stats',
    options: { username: 'marcalexiei', theme: 'dark', rank_icon: 'percentile' },
  });

  const download = page.locator('[data-anvil="download"]');
  await expect(download).toHaveAttribute('download', 'marcalexiei-stats-config.json');
  await expect(download).toHaveAttribute('href', /^blob:/);
});

test('the file is named after the card and whoever it is for', async ({ page }) => {
  const download = page.locator('[data-anvil="download"]');
  const shown = page.locator('[data-anvil="filename"]');
  const command = page.locator('[data-anvil="command"]');

  await expect(shown).toHaveText('marcalexiei-stats-config.json');
  await expect(command).toHaveText(
    'npx @stats-forge/github-stats-forge-cli --config marcalexiei-stats-config.json --generate',
  );

  // The repository, not its owner: the last required param is what the card is about.
  await setCard(page, 'pin');
  await expect(download).toHaveAttribute('download', 'eslint-zod-pin-config.json');

  // A typed subject reaches a file name, so what a file system reads specially is dropped.
  await field(page, 'repo').fill('../My Repo!');
  await expect.poll(() => download.getAttribute('download')).toBe('My-Repo-pin-config.json');

  await field(page, 'repo').fill('');
  await expect.poll(() => download.getAttribute('download')).toBe('pin-config.json');
});

test('stands the card on the ground its own theme implies', async ({ page }) => {
  // The theme a card wears when none is named is `default`, whose background is all but white.
  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'light');

  await pick(page, 'theme', 'tokyonight');
  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'dark');
  // The control moves with it, so it never says one thing while the frame shows another.
  await expect(backdropBar(page)).toHaveJSProperty('value', 'dark');

  await pick(page, 'theme', 'light_github');
  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'light');
  await expect(backdropBar(page)).toHaveJSProperty('value', 'light');
});

test('a theme that implies no ground leaves the one showing alone', async ({ page }) => {
  // `transparent` shows whatever is behind it, so it asks for neither ground — and has no
  // preference of its own either way, which is why this is asserted from both.
  await setDropdown(page, 'theme', 'tokyonight');
  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'dark');

  await setDropdown(page, 'theme', 'transparent');
  await expect(drawnCard(page)).toBeVisible();
  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'dark');

  await setDropdown(page, 'theme', 'light_github');
  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'light');

  await setDropdown(page, 'theme', 'transparent');
  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'light');
});

test("the backdrop is the preview's, and writes nothing into the card", async ({ page }) => {
  const before = await savedCard(page);

  await backdropBar(page).locator('wa-radio[value="dark"]').click();
  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'dark');

  expect(await savedCard(page)).toEqual(before);
  // And it carries no `data-option`, which every control that does write a param does.
  await expect(backdropBar(page)).not.toHaveAttribute('data-option');
});

test('a background of your own wins over the theme, once it is a colour', async ({ page }) => {
  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'light');

  // Half a hex names no colour, so the ground holds until there is one to read.
  await queryBox(page).fill('bg_color=0d');
  await expect.poll(() => savedParam(page, 'bg_color')).toBe('0d');
  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'light');

  await queryBox(page).fill('bg_color=0d1117');
  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'dark');
});

test('a per-scheme background leaves the ground alone, the card following the browser', async ({
  page,
}) => {
  // With a `_light` or `_dark` background the card carries a `prefers-color-scheme` block, so
  // neither ground is the one it will be seen on and the page does not choose for you.
  await queryBox(page).fill('bg_color_dark=0d1117');
  await expect.poll(() => savedParam(page, 'bg_color_dark')).toBe('0d1117');

  await expect(previewFrame(page)).toHaveAttribute('data-backdrop', 'light');
});

test('says nothing about waiting once the card is up', async ({ page }) => {
  await expect(previewFrame(page)).not.toHaveAttribute('aria-busy');
  await expect(page.locator('.anvil-busy-chip')).toBeHidden();
});

test('a redraw from the recording never flashes the indicator', async ({ page }) => {
  /*
   * The held pause is what keeps an indicator off a draw that finishes in milliseconds, and a
   * recorded one always does — so the guard is that nothing appeared at all, rather than that it
   * appeared and left. Each redraw below is waited on through the card itself, so by the time the
   * log is read the draw has resolved and its own timer is cancelled or fired.
   *
   * The other half — an indicator on a draw that really is slow — needs an instance to be slow,
   * and this build has none. That is what `data-source` says.
   */
  await expect(page.locator('[data-anvil="root"]')).toHaveAttribute('data-source', 'sample');

  const flashes = (): Promise<Array<string>> =>
    page.evaluate(() => (globalThis as unknown as { busySeen: Array<string> }).busySeen);

  await previewFrame(page).evaluate((element) => {
    const seen: Array<string> = [];
    (globalThis as unknown as { busySeen: Array<string> }).busySeen = seen;
    new MutationObserver(() => {
      seen.push(element.dataset['busy'] ?? 'gone');
    }).observe(element, { attributes: true, attributeFilter: ['data-busy'] });
  });

  await setCard(page, 'top-langs');
  await expect(drawnCard(page)).toHaveAttribute('width', '300');

  await pick(page, 'layout', 'donut');
  await expect(drawnCard(page)).toHaveAttribute('width', '400');

  await setCard(page, 'stats');
  await expect(drawnCard(page)).toHaveAttribute('width', '500');

  expect(await flashes()).toEqual([]);
});

test('the backdrop says it follows the theme, and gives the detail on hover', async ({ page }) => {
  const badge = page.locator('#anvil-backdrop-note');
  const tooltip = page.locator('wa-tooltip[for="anvil-backdrop-note"]');

  // The visible half is the part that keeps the switch moving on its own from being a surprise.
  await expect(badge).toBeVisible();
  await expect(badge).toContainText("Follows the card's theme");
  // The rest is what the tooltip is for: which background it reads, and when it reads none.
  await expect(tooltip).toContainText('the bg_color you set');
  await expect(tooltip).toContainText('names neither');

  const isOpen = (): Promise<boolean> =>
    tooltip.evaluate((element) => (element as HTMLElement & { open: boolean }).open);

  expect(await isOpen()).toBe(false);
  await badge.hover();
  await expect.poll(isOpen).toBe(true);

  // And reachable without a pointer, as the source badge is.
  await page.keyboard.press('Escape');
  await badge.focus();
  await expect.poll(isOpen).toBe(true);
});

test('the frame holds its size under the shortest card', async ({ page }) => {
  // It was its own padding until the first card landed — too small a box to hold the indicator
  // that says one is coming — and it resized on every card switch.
  const height = (): Promise<number> =>
    previewFrame(page).evaluate((element) => element.getBoundingClientRect().height);

  expect(await height()).toBeGreaterThanOrEqual(MIN_FRAME);

  await setCard(page, 'gist');
  await expect(drawnCard(page)).toHaveAttribute('height', '120');
  expect(await height()).toBeGreaterThanOrEqual(MIN_FRAME);
});

test('the indicator covers the whole frame it is over', async ({ page }) => {
  // Starlight's `--sl-content-gap-y` falls on the frame's second child, and a top margin on an
  // `inset: 0` box moves it down and shrinks it — so the frame's top edge stayed bright mid-draw.
  const gaps = await previewFrame(page).evaluate((element) => {
    element.dataset['busy'] = '';
    const frame = element.getBoundingClientRect();
    const scrim = element.querySelector('.anvil-busy')?.getBoundingClientRect();
    return scrim === undefined
      ? undefined
      : {
          top: Math.round(scrim.top - frame.top),
          bottom: Math.round(frame.bottom - scrim.bottom),
          left: Math.round(scrim.left - frame.left),
          right: Math.round(frame.right - scrim.right),
        };
  });

  // One pixel on each side, which is the border the padding box does not reach.
  expect(gaps).toEqual({ top: 1, bottom: 1, left: 1, right: 1 });
});
