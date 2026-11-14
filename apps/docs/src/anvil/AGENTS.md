# The anvil

> Scoped to this tree; the repo-wide rules are in the root `AGENTS.md`.

`/anvil/` is the card builder: a form over a card's options, the card redrawn beside it, and the file
the CLI's `--config` reads. A rule with no link comes from [#58].

## Privacy and the data it draws

- **Each source writes its own prose** ([#79]), "nothing you type is sent anywhere" being true of one.
  `source.ts` has the samples, which never leave the browser, and an instance, which draws with its
  token; each carries a `badge`, `aside`, `detail` and `identityNote` beside its `draw`.
  - **The seam returns a `Preview`, not an `ApiResult`**, and `PROBLEMS` says what each code means here.
  - **Both sources are bundled**, so a tokenless instance falls back to the samples; the picker shows
    only when there is a choice.
  - **An instance's cards are at the origin's `/api/**`**, never under the base.
  - **A text field redraws after a pause**, sparing the token; `writeFile` still runs at once. An
    identity field waits `NAME_PAUSE`, longer, since each half-typed name draws a not-found card.
  - **The card's URL is offered only on an instance**; an e2e test asserts it is hidden otherwise.
  - **An instance draws the seeded sample identity from the samples**, matched in any case: the
    account is made up, so live the first card would be an error card. `drawing()` in `ui.ts` picks
    the source, so the badge says mock data and the card's URL is hidden until another is named.
- **Every Web Awesome icon slot is inline SVG, and the toast's `create()` gets no `icon`**: `wa-icon`
  fetches from Font Awesome's CDN. The privacy test holds it.
- **It draws through core's public `./api` handlers**, with
  `new CardConfig({ pats: [dummy], fetch: orNotFound(fixtureFetch) })`: core's api does not grow,
  a rejected option draws the real error card, and the SVG matches the CLI's.
- **`fixtures.ts` is the fictional account, answering in the browser as `pnpm docs:cards` answers
  the CLI** ([#225]). It throws on a request it cannot answer; `orNotFound` turns that into GitHub's
  error, so the page draws an error card rather than waiting out the retryer.
  - **Fixture figures exercise the options**: stars that read differently under `number_format`, more
    languages than `langs_count`, more repositories than `repos_count`, a description that wraps.
  - **`check-anvil` draws every card with its `maximal` options, tokenless, in CI and `check-all`**,
    and checks that an unanswered request draws the not-found card at once.
  - Fixtures are typed as core's query results, so a field a query gains fails `pnpm typecheck`;
    `check-graphql-types` ties the queries to GitHub. Its imports from core's source are type-only,
    so they cost the bundle nothing.
- **The page says what that costs**: options changing how a card is drawn are exact; options
  changing what is counted leave the sample numbers alone.
- **The sample identity seeds the required fields** ([#225]): `SAMPLE` in `cards.ts`, imported by
  `fixtures.ts`. A typed username still draws the sample, and a note says so; **keep the note unless
  the fields become read-only**. The saved file puts the required params first, or the CLI rejects
  it, and `CARDS` throws on a required param with no seed.

## Cards and themes

- **Every card offers every theme, grouped by the ground each implies**: light, either-way, dark.
  Only `transparent` reads on both, so it alone is under "Either".
- **A card's `category` (`user`, `repo`, `org`) picks its picker heading** ([#64]); a gist is `repo`. `CARD_GROUPS` is built like `themeGroups`: order from `GROUP_LABELS`,
  the catalog's order inside, empty headings dropped.
- **The cards are grouped alike in the picker, the sidebar (`astro.config.ts`) and the overview**
  ([#105]). A card page's title is the card's name without "card". Only `Fetchers` opens folded, and
  cards and fetchers stay apart, split by audience.
- **The "selected card's page" link is checked at build**: `anvil.astro` validates each card's `docs`
  slug in `cards.ts` against the content collection.
- **The options come from `packages/catalog`** ([#126]). `apps/docs` adds only each card's sample
  identity and `maximal` params, and **throws on a catalog card with no entry**. A control
  follows the option's `kind` and steps by `numericStep` (an e2e test checks `1` and `any`), sectioned
  by `OPTION_GROUPS` into expandable blocks: "What it draws" and "Theme and border" lead, open, and
  the rest open folded.
- **The theme is two pickers writing one `theme` param**: "Theme", and "Dark mode", which makes it a
  `light,dark` pair and is left unset to wear one theme in both.
- **Core and the catalog bundle from source via `@github-stats-forge/source`, under both `vite.resolve` and
  `vite.ssr.resolve`.** The condition misses the client build, so `docs:build` builds the packages first.

## The preview

- **A card is drawn into a shadow root**, under `.anvil-card`: an inlined SVG's `<style>` is
  document-wide, and the stats card's `.icon { display: none }` hid the page's icons.
- **The preview is rewritten only when it differs** from the last markup `ui.ts` wrote, not from
  `innerHTML`, which comes back re-serialised.
- **The card stands on the ground it asks for** ([#86]): `backdropFor` in `themes.ts` asks core's
  `cardGround`, so the preview never judges a background differently from the card, and writes the
  answer into the frame's `data-backdrop`.
  - **The grounds are GitHub's literals, `#ffffff` and `#0d1117`.** A card carrying both schemes
    takes the browser's ground and turns with it; `undefined` holds still: a single translucent
    background, or a theme param core does not know.
  - **A card carrying both schemes is painted as a visitor on the ground sees it**: `asSeenOn`
    turns its `prefers-color-scheme` block on or off, so the switch shows each look; the card's
    markup and the saved file stay untouched.
  - **It is the one control without `data-option`**, writing nothing into the card (an e2e test checks
    both halves): `createSegments`, found by `wa-radio-group.anvil-backdrop`.
  - **A ground chosen by hand holds** until the theme changes (`followedTheme` in `ui.ts`), or, for
    a card carrying both schemes, until the browser's scheme turns.
  - **The ground moves at once**, before its redraw finishes. A badge says it follows the theme, with
    the detail on hover; the badges are `#anvil-source` and `#anvil-backdrop-note`.
  - **The frame is `min-height: 16rem` and centres with `margin: auto`**: `justify-content: center`
    clips a wide card's left edge.
- **Only a draw _taking_ a while gets an indicator** ([#86]): `BUSY_PAUSE` arms a timer per draw, so
  the samples and a cache hit never flicker.
  - **A `Drawing…` chip over a scrim**, not a bare spinner, which read as part of the card. The spinner
    is `aria-hidden`; the word and the frame's `aria-busy` reach a screen reader.
  - **The overlay is the preview's sibling**, as the shadow root replaces the preview's contents;
    `data-busy` drives `display`, and the scrim clears `margin-block` and inherits `border-radius`.
  - **Only the never-flashes half is tested**; the other needs a slow instance, checked by hand.

## Writing it

- **Web Awesome (`@awesome.me/webawesome`) provides the controls**: a native `<select>` cannot draw a
  theme's colors.
  - **Set the derived tokens too**: a `var()` in a custom property resolves on the root, against the
    light palette. Text on the accent fill is a literal `#fff`.
  - **Map the quiet brand pair** (`--wa-color-brand-fill-quiet` and `-on-quiet` to
    `--sl-color-accent-low` and `-high`), or a selected segment's label vanishes.
  - **No `native.css`**, which fights Starlight; sizes are `s`, not the deprecated `small`; use its
    seams: `part`, a `<small>` heading and `wa-divider` between groups.
- **A boolean option is `default`, `on` or `off`**, `default` writing no param.
- **A control carries `data-option="<param>"`, which the tests find**: `label` is not reflected.
  "Dark mode" is `theme-dark`, as it writes the second half of `theme` rather than a param.
- **The saved file is `{answers}-{card}-config.json`** ([#67]), each required answer slugged, so a
  pin names its owner and two owners' same-named repositories never share a file. `redraw` writes
  the heading, the `download` and the `--config` line together; the toasts read the name at click
  time.
- **Copy and download report through a `wa-toast`, and the buttons keep their names.** No `aria-live`
  on the stack (Web Awesome mirrors each toast into its own region); override the close button's hover
  colour (an e2e test checks it); keep the stack inside `[data-anvil="root"]`, where `mount` looks.
- **Two adjacent buttons need their margin cleared**: Starlight's content gap exempts `a`, not `button`.
- **`src/styles/anvil.css` is imported by the page, not `customCss`**, and stays unscoped, since
  `ui.ts` builds the controls at runtime.
- **A line break right before an element is dropped**: write `{' '}` (an e2e test holds it).
- **A permanent truth is a badge with a tooltip, not a callout**, its essential half visible.
- **The description is shown and written into the meta**, from one `DESCRIPTION`.
- **A successful draw says nothing**: the status line is empty, `data-state` is `ok`.
- **Links out open in a new tab through `components/NewTabLink.astro`**, so a half-built card
  survives; not `ExternalLink`, as some links stay on this site.

## The browser tests

`apps/docs/e2e/anvil.spec.ts`, Playwright, run by `pnpm docs:e2e` and CI's docs job, is **the only
check of the anvil in a browser**.

- **It tests the built site**, which is what a visitor gets. `reuseExistingServer` is `false`: a stray
  server fails the run rather than serving a stale build.
- **`e2e/serve.ts` serves it** (`astro preview` always daemonizes), copying `static.ts`'s table and
  guard so the site does not depend on the server. Keep the two agreed.
- **Take the newest `@playwright/test` older than `minimumReleaseAge`**, never an exclusion.
- **CI installs Chromium without `--with-deps`** ([#389]): the runner already has its libraries, and
  apt once spent 7 minutes on fonts no test reads. A missing library fails the launch, loudly.
  Playwright's image needs a digest pin and lacks the `jq` that `setup-node-and-pnpm` reads.
- **`excludeFiles: ['apps/docs/e2e/**']` keeps vitest's rules off it** ([#132]).
- **One test asserts the privacy claim**, saying first which source draws: it records every request
  while drawing every card, and fails on any leaving the origin **or reaching `/api/**`**. It
  compares `new URL(…).origin`, taken once, never URL prefixes.
- **A copy test grants clipboard permission; a download is read by `fetch`ing the anchor's blob URL
  inside the page.**
- **`pick` returns only once the listbox has closed**: Web Awesome hides it when the close
  animation ends, even if it was reopened meanwhile, and the next pick's click then hangs.
- **The drawn card is `[data-anvil="preview"] .anvil-card > svg`**, a direct child: a card's icons are
  `<svg>` too.
- **`hide_title` leaves the name in `<desc>`**, so assert on `getByTestId('card-title')`.

[#58]: https://github.com/stats-forge/github-stats-forge/pull/58
[#64]: https://github.com/stats-forge/github-stats-forge/pull/64
[#67]: https://github.com/stats-forge/github-stats-forge/pull/67
[#79]: https://github.com/stats-forge/github-stats-forge/pull/79
[#86]: https://github.com/stats-forge/github-stats-forge/pull/86
[#105]: https://github.com/stats-forge/github-stats-forge/pull/105
[#126]: https://github.com/stats-forge/github-stats-forge/pull/126
[#132]: https://github.com/stats-forge/github-stats-forge/pull/132
[#225]: https://github.com/stats-forge/github-stats-forge/pull/225
[#389]: https://github.com/stats-forge/github-stats-forge/pull/389
