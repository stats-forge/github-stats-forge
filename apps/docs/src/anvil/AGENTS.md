# The anvil

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

`/anvil/` is the site's card builder: a form over a card's options, the card redrawn beside it, and
the file the CLI's `--config` reads ([#58]). Unless another change is linked, a rule here comes from
that PR.

## Privacy and the data it draws

- **"Nothing you type is sent anywhere" is true of one source only, so the source writes its own
  prose** ([#79]). `source.ts` has two implementations — the samples, which never leave the browser,
  and an instance, which draws with its own token — and each carries its own `badge`, `aside`,
  `detail` and `identityNote` beside its `draw`.
  - **The seam returns a `Preview`, not an `ApiResult`**: a card response carries a code and no
    prose, deliberately, so `PROBLEMS` in `source.ts` says what each code means here.
  - **Both sources are in the bundle**, so an instance with no token can fall back to the samples.
    The picker appears only where there is a choice.
  - **An instance's cards are at `/api/**` on the origin, never under the base.**
  - **A text field redraws after a pause, not per keystroke**, sparing the instance's token;
    `writeFile` still runs at once.
  - **The card's URL is offered only on an instance**, the origin being the one thing a static build
    cannot know. `e2e/anvil.spec.ts` asserts it stays hidden without a server.
- **Fill every Web Awesome icon slot with inline SVG, and never pass `icon` to the toast's `create()`**:
  `wa-icon` fetches from Font Awesome's CDN. The privacy test is what keeps that honest.
- **It draws through core's public `./api` handlers, never the renderers**, with
  `new CardConfig({ pats: [dummy], fetch: createSampleFetch(samples) })`. Core's api does not grow,
  a rejected option draws the error card you would really get, and the SVG matches the CLI's.
- **`samples.json` is generated from a fictional account, committed, and never hand-edited** ([#225]).
  `pnpm --filter ./apps/docs run generate-anvil-samples` drives every handler with
  `scripts/fixtures.ts` as their `fetch` — so a sample is only ever of a request the anvil makes, and
  one the fixtures cannot answer throws. **Regenerate it whenever a query changes.**
  - **Pick fixture figures for the options**: stars that read differently under `number_format`,
    more languages than the default `langs_count`, more repositories than `repos_count` allows, a
    description long enough to wrap.
  - **`check-anvil-samples` guards it, needs no token, and runs in CI and `check-all`**: the
    generator's `--check`, then a draw of every card through the browser's replay path.
  - **Each fixture is typed as core's generated query result**, so a field a query gains fails
    `pnpm typecheck`. This checks against what core reads, not against GitHub —
    `check-graphql-types` ties the queries to GitHub's schema.
- **A request is keyed by what it asks, never by the whole request.** `sample-key.ts` is read by the
  generator and the transport both. A card's variables move with its options, so:
  - a GraphQL request keys on its **operation name** plus a hash of its query with the range fields
    collapsed — the name alone is too coarse for documents built at runtime;
  - **collapse the whole run of range fields, not each field**, or the hash still moves with the year
    count;
  - a REST search keys on its path and **qualifier names**, dropping `repo:` and `owner:` (values
    you choose) and keeping `type:`;
  - ranges are aliased by position (`range_0`, …), and `createSampleFetch` re-aliases a sample onto
    however many a request asks for.
- **The page says what that costs**: options that change how a card is drawn are exact; options that
  change what is counted leave the sample numbers where they are.
- **The sample identity seeds the required fields rather than replacing them** ([#225]). `SAMPLE` in
  `cards.ts` names the fictional account and `fixtures.ts` imports it. A typed username still
  resolves, to the sample's numbers, and a note under the fields says so — **don't remove the note
  without making the fields read-only**.
  - **The saved file carries the required params first**, or the CLI rejects it.
  - `CARDS` throws when a `required` param has no seed.

## Cards and themes

- **Which themes a card may wear is ported from `ghse`'s wizard, not invented here.** Themes come in
  pairs, `X` and `X_repocard`, and each side offers its own half, grouped light, either-way, dark.
  `ghse` also hides some themes from its picker; that editorial choice is **not** copied.
- **A card's `category` (`user`, `repo`, `org`) answers two questions** ([#64]): its heading in the
  picker, and which half of each theme pair it wears. A gist is `repo`. `CARD_GROUPS` is built like
  `themeGroups`: order from `GROUP_LABELS`, the catalog's order inside, empty headings dropped.
- **The cards are divided the same way in three places** ([#105]): the anvil's picker, the sidebar in
  `astro.config.ts`, and the overview page.
  - **A card page's title is the card's name, without "card"**; `PageTitle.astro` puts the trail,
    read from the sidebar, above it.
  - **`Fetchers` is the one sidebar group that opens folded**: it is reference for a library consumer.
    Cards and fetchers stay separate sections, split by audience — they are not one-to-one.
- **The "selected card's page" link follows the card, and the build checks it.** The slug is `docs`
  on each card in `cards.ts`; `anvil.astro` checks every slug against the content collection, since
  the validator cannot see an href set at runtime.
- **The option catalog is `packages/catalog`, imported rather than restated** ([#126]). `apps/docs`
  adds only each card's sample identity, its theme half and its `maximal` params, and that overlay
  **throws when a catalog card has no entry**.
  - A control is chosen by the option's `kind`, and a numeric field steps by the catalog's
    `numericStep`; `e2e/anvil.spec.ts` asserts a count steps by `1` and a weight by `any`.
  - Controls are sectioned by `group` under `OPTION_GROUPS`; only "Colors and border" opens folded.
- **The site bundles core and the catalog from source, through `@stats/source`, set under both
  `vite.resolve` and `vite.ssr.resolve`.** The condition does not reach the client build, so
  `docs:build` is `build:packages && astro build`.

## The preview

- **A card is drawn into a shadow root**, because an inlined SVG's `<style>` is document-wide: the
  stats card's `.icon { display: none }` hid every `svg.icon` on the page. The card sits under an
  `.anvil-card` wrapper inside that root.
- **The preview is rewritten only when it differs.** `ui.ts` compares with the last markup it wrote,
  not `innerHTML`, which comes back re-serialised.
- **The preview stands the card on the ground the card asks for** ([#86]). `backdropFor` in
  `themes.ts` answers from `bg_color`, else the theme, else the card's default theme, and
  `data-backdrop` on the frame is what the stylesheet reads.
  - **The two grounds are literals, `#ffffff` and `#0d1117`** — GitHub's, not the site's theme.
  - **`undefined` means hold still**: a translucent background, a per-scheme override, or an unknown
    theme.
  - **It is the one control with no `data-option`**, because it writes nothing into the card; an e2e
    test asserts both halves. It is `createSegments`, found by `wa-radio-group.anvil-backdrop`.
  - **The ground moves at once, before the redraw it triggered finishes.**
  - **That it follows the theme is said by a badge with the detail on hover.** Locate the two badges
    by id: `#anvil-source` and `#anvil-backdrop-note`.
  - **The frame has `min-height: 16rem`, and centres a short card with `margin: auto`**, not
    `justify-content: center`, which clips a wide card's left edge.
- **A draw that is _taking_ a while gets an indicator; one that is merely happening does not** ([#86]).
  `BUSY_PAUSE` arms a timer per draw, so the samples and a cache hit never flicker.
  - **It is a chip saying `Drawing…` over a scrim**, not a bare spinner, which read as part of the
    card. The spinner is `aria-hidden`; the word and the frame's `aria-busy` are what a screen reader
    gets.
  - **The overlay is the preview's sibling**: the shadow root replaces what the preview holds.
  - **`data-busy` drives `display`**, which also stops the spin.
  - **The scrim clears `margin-block` and inherits `border-radius`**, or Starlight's content gap
    shrinks it.
  - **Only the never-flashes half is tested**; the appearing half needs a slow instance, verified by
    hand.

## Writing it

- **Web Awesome (`@awesome.me/webawesome`) provides the controls, not hand-written widgets**: a native
  `<select>` cannot draw a theme's colors, and custom elements drop into the DOM `ui.ts` builds.
  - **Set the derived tokens, not just the base ones**: a `var()` inside a custom property resolves
    on the root, against the light palette.
  - **What sits on the accent fill is a literal `#fff`**, not a page text colour that inverts.
  - **Map the quiet brand pair too** (`--wa-color-brand-fill-quiet` / `-on-quiet` to Starlight's
    `--sl-color-accent-low` / `-high`), or a selected segment's label vanishes.
  - **`native.css` is not imported**: it would fight Starlight across the page.
  - **Sizes are `s`, not `small`**: the long forms are deprecated.
  - **Reach for its own seams** — `part`, and a `<small>` heading plus `wa-divider` between groups.
- **A boolean option is three states — `default`, `on`, `off` — not a switch.** A card's default may
  be either, so `default` writes no param.
- **A control carries `data-option="<param>"`, and the tests find it by that**: Web Awesome's `label`
  is not reflected to an attribute.
- **The saved file is `{subject}-{card}-config.json`** ([#67]), the subject being the last required
  param, slugged. `redraw` writes the panel heading, the anchor's `download` and the `--config` line,
  so all three agree; the toasts read the name at click time.
- **Copy and download report through a `wa-toast`, and the buttons keep their names.**
  - **Don't add `aria-live` to the stack**: Web Awesome mirrors each toast into its own live region.
  - **Override the close button's hover colour**, which resolves against the light palette; an e2e
    test asserts hover matches rest.
  - **The stack lives inside `[data-anvil="root"]`**, where `mount` finds every element; outside it,
    the page's script throws.
- **Two buttons in a row need their margin cleared; a button and a link do not**: Starlight's content
  gap exempts `a`, not `button`.
- **`src/styles/anvil.css` is imported by the page, not listed in `customCss`**, so it serves this page
  alone. It stays unscoped, because `ui.ts` builds the controls at runtime.
- **A line break right before an element is dropped**: write `{' '}` ahead of it. An e2e test holds it.
- **A permanently true statement is a badge with a tooltip, not a callout**, with the essential half
  visible.
- **The page's description is shown as well as written into its meta**, from one `DESCRIPTION` const.
- **A successful draw says nothing**: the status line is empty on success, and `data-state` still
  says `ok` for the tests.
- **Links out open in a new tab, through `components/NewTabLink.astro`**, so a half-built card is not
  lost. It is not `ExternalLink`: some of its links stay on this site.

## The browser tests

`apps/docs/e2e/anvil.spec.ts`, Playwright, run by `pnpm docs:e2e` and CI's docs job. **It is the only
thing that checks the anvil in a browser**: `check-anvil-samples` proves a card can be drawn, the
build that the page compiles.

- **It tests the built site, not the dev server**, because the bundle is what a visitor gets.
- **`reuseExistingServer` is `false`**: a reused server serves a stale build. A stray server on the
  port fails the run instead, which is the better failure.
- **`e2e/serve.ts` serves it, because `astro preview` always daemonizes.** It copies
  `apps/server/src/static.ts`'s table and guard on purpose — importing them makes the site depend on
  the server that ships it. Keep the two tables agreed.
- **Take the newest `@playwright/test` older than `minimumReleaseAge`**, rather than adding it to
  `minimumReleaseAgeExclude`, which is for first-party packages.
- **`excludeFiles: ['apps/docs/e2e/**']` in `oxlint.config.ts` keeps vitest's rules off it** ([#132]),
  the suites here being `.spec.ts` too.
- **One test asserts the privacy claim**: it records every request while drawing every card and
  fails on any leaving the origin **or reaching `/api/**`**. It states which source is drawing first.
  It compares `new URL(…).origin`, taken once — not URL prefixes.
- **Grant clipboard permissions for a copy test, and `fetch` the blob URL off the anchor from inside
  the page** to read a download.
- **The drawn card is `[data-anvil="preview"] .anvil-card > svg`**, a direct child: a card's own icons
  are `<svg>` too.
- **`hide_title` leaves the card's name in its `<desc>`**, so assert on `getByTestId('card-title')`.

[#58]: https://github.com/stats-forge/github-stats-forge/pull/58
[#64]: https://github.com/stats-forge/github-stats-forge/pull/64
[#67]: https://github.com/stats-forge/github-stats-forge/pull/67
[#79]: https://github.com/stats-forge/github-stats-forge/pull/79
[#86]: https://github.com/stats-forge/github-stats-forge/pull/86
[#105]: https://github.com/stats-forge/github-stats-forge/pull/105
[#126]: https://github.com/stats-forge/github-stats-forge/pull/126
[#132]: https://github.com/stats-forge/github-stats-forge/pull/132
[#225]: https://github.com/stats-forge/github-stats-forge/pull/225
