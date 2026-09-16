# The anvil

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

`/anvil/` is the site's card builder: a form over a card's options, the card redrawn beside it, and
the file the CLI's `--config` reads. Renamed from "wizard" on 2026-09-07, because the sibling
`ghse` already has one.

- **A preview comes from a source, and which one it is decides the prose as much as the numbers.**
  `src/anvil/source.ts` is one interface with two implementations: the recording, which never
  leaves the browser, and the instance, which draws with its own token and its own allowlists.
  A source therefore carries its own `badge`, `aside`, `detail` and `identityNote` alongside its
  `draw`, and `ui.ts` writes whichever is drawing into the page — **"nothing you type is sent
  anywhere" is true of one of them only**, and it was hardcoded in `anvil.astro` until 2026-09-10.
  - **The seam returns a `Preview`, not an `ApiResult`.** The page needs the SVG and a line of
    text, and a card response carries the code and the param and no prose — deliberately: a
    header holding the message would carry whatever `CardError.from` wrapped, possibly an
    upstream string, into the one place every proxy logs. So `PROBLEMS` in `source.ts` says what
    each code means in the anvil's terms, and the error card the reader is looking at says the
    rest. `content` is `undefined` when the draw never happened, which keeps the last card up.
  - **Both sources are in the bundle either way**, so an instance with no `PAT_1` configured can
    fall back to the recording. The picker appears only where there is a choice.
  - **The instance's cards are at `/api/**` on the origin, never under the base**, the routes
    being the server's rather than the site's.
  - **A text field redraws after a pause, not per keystroke.** Free with a recording, a request
    against the instance's token otherwise. `writeFile` still runs at once, so the saved file and
    the URL never lag behind what is typed; only `draw` waits.
  - **The card's URL is offered above the saved file, and only on an instance.** The origin is the
    one thing a static build cannot know and the browser always does, which is what makes a
    copy-paste `![](…)` correct rather than illustrative. The panel is in the markup on every
    build and unhidden by `ui.ts`; `e2e/anvil.spec.ts` asserts it stays hidden where there is no
    server.
- **It draws through core's public `./api` handlers, never through the card renderers.**
  `CardConfig` takes a `fetch`, and its own doc comment already names the browser as a host, so the
  page hands it a transport that answers from a recording:
  `new CardConfig({ pats: [dummy], fetch: createSampleFetch(samples) })`. Three things follow, and
  they are why a `./cards` export carrying render functions plus fixtures was rejected:
  - core's public API does not grow, so the page needs no changeset and stays an ordinary consumer
  - the preview walks the real path — query string, validation, fetch, render — so a rejected option
    draws **the same error card a reader would really get**, rather than a page-level message
  - the SVG is byte-identical to what the CLI writes
- **`samples.json` is recorded, committed, and never hand-edited.**
  `pnpm --filter ./apps/docs run record-anvil-samples` drives the same eight handlers with a `fetch`
  that reaches the network and keeps what comes back — so a recording cannot be of a request the
  anvil does not make. It needs `PAT_1` in the root `.env`, the same trade `pnpm docs:cards` makes,
  and its output goes through oxfmt's API so `pnpm format` leaves it alone.
  - **`check-anvil-samples` is what guards it, and needs no token, so it runs in CI.**
    Nothing types the recording against core's GraphQL types — the anvil reads only core's public
    api — so the guard is behavioural: change a query's shape and the card stops drawing.
    It is in `check-all` and in CI's docs job. It caught two real gaps while being written.
- **A request is keyed by what it asks, never by the whole request.** `sample-key.ts` is read by the
  recorder and the transport both, so the two cannot disagree. A card's variables move with its
  options, so an exact-match key would miss most of the option space:
  - a GraphQL request keys on its **operation name**, plus a hash of the query with its range fields
    collapsed. The name alone is too coarse for the documents built at runtime —
    `userReposContributedTo` is one name over two selections, and the stats card and the
    contributed-to card each send one; keyed by name alone they overwrote each other.
  - **collapse the whole _run_ of range fields, not each field.** Collapsing them one by one leaves
    N markers, so the hash still moved with the year count and every changed `from` missed.
  - a REST search keys on its path and its **qualifier names**, with `repo:` and `owner:` dropped —
    those carry values the reader chooses — and `type:` kept, because `type:pr` and `type:issue` are
    different figures.
  - **ranges are aliased by position (`range_0`, `range_1`, …), so one recording answers any
    length**: `createSampleFetch` re-aliases what it recorded onto however many the request asked
    for. That is what lets `from` and `to` move over the whole allowed span.
- **The consequence is stated on the page, not hidden.** Options that change how a card is _drawn_
  are exact; options that change _what is counted_ leave the sample numbers where they are.
- **Which themes a card may wear is ported from `ghse`, not invented here.** `src/anvil/themes.ts`
  follows that project's wizard so both offer the same themes for the same card. Themes come in
  pairs: `X` for the cards describing a user, `X_repocard` for the ones describing a repository or a
  gist, and each side offers only its own half — which is also why a card's default theme needs no
  table, `default` and `default_repocard` being such a pair. The list is then grouped by the
  background each theme implies: light, the two that read either way (`transparent`,
  `ambient_gradient`), then dark. `ghse` also excludes nine themes from its picker; that is an
  editorial choice and has **not** been copied.
- **The cards are divided the same way in three places, and it is the category order.** A user's
  cards, then a repository's or gist's, then an organization's, under the same three headings: the
  anvil's picker groups by it, the sidebar in `astro.config.ts` nests a group per category, and the
  overview page carries a table under each. The overview had one table and a `Describes` column,
  and the sidebar was flat, until 2026-09-12 — the argument for the flat list was that a group held
  a single page, which a second organization card ends.
  - **A card page's title is the card's name and no longer ends in "card".** Seven titles read
    "Stats card" under a sidebar heading that already says Cards, and "Stats" is what the CLI's own
    menu, the anvil's picker and the overview table call it. `src/components/PageTitle.astro` puts
    the trail — `Cards / User` — above the title in its place, and **reads it out of the sidebar**
    rather than off the path, so it is the nav's own words. A page in a group that is not nested
    gets none, which today means the cards have one and nothing else does.
  - **`Fetchers` is the one sidebar group that opens folded.** It is reference for a library
    consumer rather than for someone putting a card in a README, and it is ten of the sidebar's
    twenty-eight links — folded, the cards and their three headings fit one screen. Cards and
    fetchers stay **separate sections**: the split is by audience, not by subject, and they are not
    one-to-one either — `fetchRepoUserStats` draws no card, and `fetchRepo` backs the pin card.
- **A card's `category` is what the card is about, and one field answers two questions.** `user`,
  `repo` or `org` in `src/anvil/cards.ts`: it groups the card picker under headings — User,
  Repository or gist, Organization — and it decides which half of every theme pair the card wears,
  `repo` taking the `_repocard` variants and everything else the plain half. A gist card is `repo`
  for both, which is why that heading names the gist as well. `CARD_GROUPS` is built the way
  `themeGroups` is, so the two dropdowns are one control with two lists: order comes from
  `GROUP_LABELS`, the cards inside a group keep the catalog's order, and a heading no card sits
  under
  is dropped. It was `'repo' | 'user'` and theme-only until 2026-09-07, when the organization card
  arrived and needed a group of its own.
- **The preview stands the card on the ground the card itself asks for, and says so with a
  control.** `backdropFor` in `themes.ts` answers "which ground" from the effective query —
  `bg_color` if one is named, else the theme, else the theme the card wears by default — and
  `data-backdrop` on `[data-anvil="frame"]` is what the stylesheet reads. A dark theme judged
  against this site's own light panel told you nothing about the README it is going into.
  - **The two grounds are literals — `#ffffff` and `#0d1117`, GitHub's own.** Same argument as
    `--wa-color-brand-on-loud` above: the ground stands in for the page the card is going to land
    on, not for this one, so it must not follow the site's theme switcher.
  - **`undefined` means hold still, and three things mean `undefined`**: a translucent background
    (`transparent`'s `ffffff00`, judged by its alpha rather than by a name in `ADAPTIVE_THEMES`), a
    per-scheme override (`bg_color_dark` and friends put a `prefers-color-scheme` block in the
    card, so it follows the browser and neither ground is the one it will be seen on), and a theme
    nobody has heard of. There whichever ground is showing stays showing rather than the page
    guessing on a reader's behalf.
  - **The control is the one in the anvil with no `data-option`**, because it is the one that
    writes nothing into the card: an e2e test asserts both halves of that. It is
    `createSegments` — the general form `createTriState` was rewritten on top of — and it is
    found by `wa-radio-group.anvil-backdrop`, which is also why the equal-thirds grid rule is
    scoped to `wa-radio-group[data-option]`.
  - **The ground leads and the card catches up.** A pick moves it at once, before the redraw it
    triggered has finished, so the control never lags behind the form; on a slow instance that
    means a second of the old card on the new ground, under the scrim that already says it is
    stale.
  - **That it follows the theme is said on the page, as a badge with the detail on hover.** A
    switch that moves on its own is a surprise unless something says it will, and the statement is
    permanently true — so it is `.anvil-badge` plus a `wa-tooltip`, the trade the source badge
    already makes, rather than a callout or a hint nobody reads. **The page now carries two badges**,
    so a locator for either is by id: `#anvil-source` and `#anvil-backdrop-note`. It is markup
    rather than the group's `hint` slot, which is `aria-labelledby`'s neighbour — slotting it into
    the label would have folded the explanation into the control's accessible name.
  - **The frame carries `min-height: 16rem`, and is a grid so the scroller fills it.** The eight
    cards run 120 to 285 tall, so without it the frame resized on every switch — and before the
    first card landed it was its own padding, a box too small to hold the indicator saying one was
    coming. A short card is centred in it by `margin: auto` on the scroller's child, **not**
    `justify-content: center`, which centres by clipping the overflow it cannot reach: a 500px card
    in a phone-width pane lost its left edge.
- **A draw that is _taking_ a while gets an indicator; a draw that is merely happening does not.**
  `BUSY_PAUSE` is 200ms, and the timer is armed per draw and cancelled by whichever draw is latest
  — so a recording, which answers in milliseconds, never flickers, and neither does an instance's
  cache hit. **Timed rather than asked of the source**: `PreviewSource` carries no "slow" flag,
  because the same source is both.
  - **It is a chip with the word `Drawing…` in it, not a bare spinner.** A spinner alone sat beside
    the stats card's own rank ring and read as part of the card, and an opacity on a dark card over
    a dark ground changes almost nothing — so the overlay is a scrim over the frame plus page-
    coloured furniture, and the `wa-spinner` inside it is `aria-hidden`, the word and the frame's
    `aria-busy` being what a screen reader gets.
  - **The overlay is a sibling of the preview, not inside it**: the card is drawn into a shadow
    root on that element, which replaces whatever it holds. The scrolling is one level in, so a
    card wider than the pane does not carry the chip sideways with it.
  - **`display`, not `hidden`.** A flex overlay outranks the attribute anyway, so the frame's
    `data-busy` is the single switch — and `display: none` stops the spin, which a hidden
    animation should do.
  - **The scrim clears `margin-block` and inherits `border-radius`.** Starlight's
    `--sl-content-gap-y` falls on the frame's second child, and a top margin on an `inset: 0` box
    moves it down and shrinks it — so the frame's top edge stayed bright mid-draw. Same rule that
    the boolean's segments already pay for, in a place it is much harder to see.
  - **The e2e suite can only assert the half that needs no instance**: that an ordinary recorded
    redraw never flashes it, through a `MutationObserver` log over `data-busy`. The appearing half
    was verified by hand against a `SITE_SERVER=true` build with a stubbed slow `/api/**`; there is
    nothing in this repository that makes a recorded draw slow enough to test it.
- **A card is drawn into a shadow root, because an inlined SVG's `<style>` is document-wide.**
  A card carries its own CSS, and inlining the SVG into HTML does not scope it: the stats card
  defaults `show_icons` off, which emits `.icon { display: none }`, and that hid **every** `svg.icon`
  on the page — the theme switcher in the site header among them. `attachShadow` is the only thing
  that keeps a card's styles inside the card, and core has no `:host` rules, so nothing changes
  appearance by moving there. The card sits under an `.anvil-card` wrapper inside that root, which
  is what gives it a selectable handle — a card's own icons are `<svg>` too. Playwright's CSS
  selectors pierce an open shadow root, so the tests needed nothing but the new path.
- **The file is named `{subject}-{card}-config.json`, and three places have to agree on that name.**
  The subject is the **last** of the card's required params, so a pin is named after the repository
  rather than its owner; a typed value is slugged, because it reaches a file name — anything outside
  `[\w.-]` becomes a dash and the ends are trimmed — and an emptied one leaves `pin-config.json`.
  `redraw` writes the panel heading, the anchor's `download` and the `--config` line under the file,
  so none of them can name a file the download does not offer, and the markup seeds none of them.
  The two toasts read the name at click time rather than closing over it.
- **Copy and download report through a `wa-toast`, and the buttons keep their names.** Copy used to
  retitle itself to "Copied", which changes a control's accessible name under whoever is pressing
  it, and download reported nothing at all. Three things follow:
  - **Do not add `aria-live` to the stack.** Web Awesome mirrors each item's text into its own
    shared live region — `role="status"`/`aria-live="polite"`, `role="alert"`/`assertive` for a
    danger, `aria-atomic="true"`, the text set on a double `requestAnimationFrame` so the region is
    registered first. A second live region would announce everything twice.
  - **Never pass `icon` to `create()`.** That resolves through `wa-icon`'s default library, which
    fetches from Font Awesome's CDN and breaks the page's privacy claim. The close button's own
    icon is `library="system"` and inline, so it costs nothing.
  - **The close button's hover colour has to be overridden.** The component's own resolves against
    Web Awesome's light palette and comes out near-black, invisible on a dark toast — while at rest
    it already follows the page. `::part(close-button):hover` and `:focus-visible` take
    `--sl-color-white`, and an e2e test asserts hover matches rest.
  - **The stack lives inside `[data-anvil="root"]`.** `mount` finds every element with
    `need(root, …)`, so a stack placed after that div threw and took the whole page's JavaScript
    with it — all 33 tests failed at once.
- **Two buttons in a row need their margin cleared; a button and a link do not.** Starlight puts
  `--sl-content-gap-y` between adjacent elements inside `.sl-markdown-content`, and its exclusion
  list names `a` but not `button` — so "Copy URL" and "Copy Markdown" sat 16px apart vertically,
  the second dropped and the first stretched by the flex line to meet it. The rule in `anvil.css`
  is `.anvil-output-head .anvil-actions > *`, specific enough to outrank it. The Copy/Download
  pair beside it never showed the bug, `a` being exempt.
- **The anvil's stylesheet is imported by the page, not listed in `customCss`.** `customCss` serves
  a file on every page in the site; this one is used by one, and Astro inlines it into that page
  alone. It stays **unscoped** rather than becoming an Astro `<style>` block, because `ui.ts` builds
  the controls at runtime and Astro's scoping only reaches elements the template itself writes.
  That import is why `import/no-unassigned-import` is off for `.astro`.
- **A line break immediately before an element is dropped, not collapsed to a space.** Two links
  wrapped onto their own line rendered as `eachcard's own page` and `options tothe library`; each
  needs an explicit `{' '}` ahead of it. There is an e2e test for it, because it is invisible in the
  source and returns the next time a paragraph is rewrapped.
- **The sample identity is the site's own, and it seeds the fields rather than replacing them.**
  Every preview under `public/cards` is drawn from the same account, and `identity` in `cards.ts`
  reuses it, so a reader sees one set of numbers across the whole site. It is the **starting value**
  of each card's `required` fields, which the reader then edits.
  - **The file has to carry the required params, because a file without them is one the CLI
    rejects.** `toQuery` walked `card.options` alone until 2026-09-07 while `render.ts` merged
    `card.identity` in behind the form, so the preview drew and the downloaded `card.json` had no
    `username` at all — valid-looking, and `missing_param` the moment it was used. `toQuery` writes
    the required params first, and `renderSampleCard` overrides nothing.
  - **Editing them is safe precisely because a recording is keyed by what a request asks, never by
    its variables** — `sample-key.ts` drops `repo:` and `owner:` for this reason. So a typed
    username still resolves, to the recorded account's numbers, and the anvil says so in a note
    under those fields. That note is the honest half of making the fields editable; don't remove one
    without the other.
  - `CARDS` throws when a `required` param has no seed, the same way it throws for a card with no
    extras at all: the field would open empty and the card would not draw.
- **The preview is rewritten only when it differs.** `ui.ts` keeps the last markup it wrote — not
  `previewRoot.innerHTML`, which comes back re-serialised and never matches — and skips the DOM
  write when the new card is identical. Typing a username otherwise replaced a card with its twin,
  which reads as "the numbers are yours now"; every option that does change the card still redraws
  it, and an option that turns it into an error card still does.
- **A statement that is permanently true is a badge with a tooltip, not a callout.** Starlight's
  `<Aside type="caution">` was tried for the mock-data notice on 2026-09-07 and rejected as too
  loud for something that is always the case. It is a `.anvil-badge` anchored by `for` to a
  `wa-tooltip`, with the essential half — "Mock data" — visible and the detail on hover, so nothing
  important is hover-only.
- **The page's description is shown as well as written into its meta.** Starlight's `splash`
  template renders the title and nothing else, so `description` reached only `<meta>`; it is now a
  `DESCRIPTION` const used in both places, and `.anvil-intro` puts it under the title.
- **A successful draw says nothing.** The status line read "Drawn from sample data — nothing you
  type leaves this page." on every success, which restated the badge directly beneath it and made up
  most of the text between the card and the file. It is empty on success — `data-state` still says
  `ok`, which is what the tests read — and `:empty` hides it; on an error it carries the message.
- **The links out open in a new tab, through `components/NewTabLink.astro`.** Following one loses a
  half-built card, and the component carries `target="_blank"`, `rel="noopener"` and the `sr-only`
  "(opens in a new tab)" so no page repeats them. **It is not called `ExternalLink`**: two of its
  three uses point at this very site, and open away only to preserve the form. `SocialIcons` keeps
  its own copy of that markup, because it is a Starlight override with `rel="me noopener"`.
- **The "selected card's page" link follows the card, and the build checks where it points.** The
  slug lives on each card as `docs` in `cards.ts`, because the pages are named for readers rather
  than after the card ids — `pin` is `repo-pin`, `top-langs` is `top-languages`. `anvil.astro`
  checks every slug against the content collection at build time; nothing else stands between a
  renamed page and a link that 404s, since `ui.ts` sets the href at runtime where the link
  validator cannot see it.
- **The option catalog is `packages/catalog`, imported rather than restated.** It carries every
  option's name, label, kind, hint and choices, and reads those choices off core's `OPTIONS` so no
  list is copied anywhere — see that package's own `AGENTS.md`. Two forms over the same options are
  not two lists. What `apps/docs` adds is only what the catalog has no use for: each card's sample
  identity, which half of every theme pair it wears, and the `maximal` params the recorder needs.
  That overlay **throws when a card in the catalog has no entry**, so a card added there is noticed
  here rather than silently undrawable.
  - The catalog imports nothing but core's public api, so pulling it into the browser costs a few
    hundred bytes and no CLI machinery. It was the CLI's `./cards` export until 2026-09-13, which
    is when that stopped meaning inquirer as well.
  - A control is chosen by the option's `kind`: `boolean` a `wa-switch`, `choice` a select, a `list`
    with choices a group of checkboxes, and everything else a field — numeric, and stepping as
    coarsely as core reads the param, where the catalog's `numericStep` says so rather than where
    this file decides. `e2e/anvil.spec.ts` asserts a count steps by `1` and a weight by `any`.
  - The controls are sectioned by each option's `group` under the catalog's `OPTION_GROUPS`, one
    `wa-details` per group in that order, so the two forms section alike; only "Colors and
    border" opens folded, because thirty controls in one column is a wall.
- **The site bundles `packages/core` and the catalog from source, through `@stats/source`.**
  `astro.config.ts` sets that condition under **both** `vite.resolve` and `vite.ssr.resolve`, the
  same trap `packages/cli/vitest.config.ts` documents. Keep both.
  - **It does not reach the client build, so `docs:build` builds the packages first.** Rolldown
    resolved neither `@stats-forge/github-stats-forge-core/api` nor the catalog from
    `src/anvil/cards.ts` on a fresh checkout, whichever came first in the file — the condition is
    honoured for typechecking, for `ssr`, and for the scripts that pass `--conditions`, but not for
    the browser bundle. `environments.client.resolve.conditions` does not help either.
  - So **`docs:build` is `build:packages && astro build`**, which is what `docs` and `docs:cards`
    always did; `docs:build` was the odd one out and only ever passed locally because `build/`
    happened to exist. It broke CI's docs job on the first run that had no `build/` — PR #58. When
    a docs step passes locally and fails in CI, delete `packages/*/build`, `apps/docs/build` and
    `apps/docs/.astro` and run it again.

## The anvil's controls

Web Awesome (`@awesome.me/webawesome`), not hand-written widgets: a native `<select>` cannot draw a
theme's colors beside its name, and an accessible listbox written here would be one more such
implementation to own. They are custom elements, so they drop into the DOM `ui.ts` already builds —
no framework, and nothing about the page's architecture changes. Shoelace was the alternative and is
the same author's earlier project, 18 months without a release; a React kit (Radix, shadcn) would
have meant adding React and rewriting the island.

Five things it costs, each already paid for:

- **Its icons resolve over the network, and this page promises nothing leaves it.** `wa-icon` fetches
  from Font Awesome's kit CDN, so every icon slot is filled with inline SVG instead — the select's
  `expand-icon` among them. The e2e suite's request assertion is what keeps that honest.
- **Set the derived tokens, not just the base ones.** `themes/default.css` declares
  `--wa-form-control-value-color: var(--wa-color-text-normal)` on `:where(:root)`, and a `var()`
  inside a custom property is resolved where that property is computed — on the root, against the
  light palette. Overriding `--wa-color-text-normal` further down never reaches it, and the checkbox
  labels came out near-black on a near-black page.
- **What sits on the accent fill must not follow the page.** `--wa-color-brand-on-loud` was mapped to
  `--sl-color-white`, which is the page's highest-contrast _text_ colour and inverts with the theme;
  in light mode the selected row and the ticked box went near-black on the accent blue. It is a
  literal `#fff`, because the fill is a saturated blue either way. Both themes now clear AA.
- **`native.css` is deliberately not imported.** It restyles native elements and would fight
  Starlight across the whole page; only `layers.css` and the theme's tokens are.
- **Sizes are `s`, not `small`.** The long forms are deprecated and warn in the console.
- **A boolean option needs three states, not two.** On, off, and _not said_ — and the third is not
  the same as off, because a card's own default may be either: `text_bold` defaults to on for the
  stats card and off for the repo card. A `wa-switch` both lied about the current state and could
  not turn the stats card's bold off, since it wrote `true` or nothing and nothing means `true`
  there. Booleans are a `wa-radio-group` of `default` / `on` / `off`, where `default` writes no param
  at all — the same convention the selects already use for their empty row.
- **Map the _quiet_ brand pair too, not just the loud one.** The selected segment of a boolean uses
  `--wa-color-brand-fill-quiet` / `-on-quiet`; left unmapped it was Web Awesome's pale blue under
  white text, so the chosen segment's own label vanished. Starlight's `--sl-color-accent-low` and
  `--sl-color-accent-high` are designed as that pair and flip together.

Its own seams are the ones to reach for: `part` for a component's internals
(`wa-select::part(listbox)` carries the panel's elevation), and a `<small>` heading plus
`wa-divider` between groups of options, because there is no option-group component.
**A control carries `data-option="<param>"`, and that is what the tests find it by** — Web Awesome's
`label` is a Lit property and is not reflected to an attribute.

## The anvil's browser tests

`apps/docs/e2e/anvil.spec.ts`, Playwright, run by `pnpm docs:e2e` from the root and by CI's docs
job. **It is the only thing that checks the anvil in a browser**, and the three checks around it
each stop short of that: `check-anvil-samples` proves each card _can_ be drawn, in Node; the build
proves the page compiles; neither proves that picking a card rebuilds the controls or that an option
reaches the renderer.

- **The suite tests the built site, not the dev server**, because the bundle is what a reader gets:
  the `samples.json` import and core's whole api reach the browser through it.
- **`reuseExistingServer` is `false`, on purpose.** Reusing whatever is on the port serves the build
  from _then_, which is how a green suite turned red inside `check-all` right after a rebuild. The
  cost is that a stray server on 4329 makes the run fail to start rather than testing the wrong
  thing — which is the better failure.
- **`e2e/serve.ts` serves it, because `astro preview` cannot.** In Astro 7 preview always
  daemonizes — the process Playwright starts exits at once and `webServer` gives up with "exited
  early" — and `--background` being opt-in does not change it. Thirty lines of `node:http` is
  cheaper than depending on that behaviour.
  - **It is a copy of `apps/server/src/static.ts`'s table and guard, on purpose.** Importing them
    was tried on 2026-09-10 and reverted the same day: the image carries the site, so the site
    depending on the server is a cycle, even one that only the e2e run walks. The cost is two
    tables to keep agreed — `.ico` had already drifted once — and the e2e copy serves the Pages
    build under its base, which the image's handler never sees.
- **`@playwright/test` is pinned at 1.62.1, which is not the latest.** 1.63.0 was two days old and
  `minimumReleaseAge` is three, so pnpm refuses it. Take the newest version older than the
  cooling-off period rather than adding it to `minimumReleaseAgeExclude` — that list is for a
  first-party publish waiting out its own rule.
- **`excludeFiles: ['apps/docs/e2e/**']` in `oxlint.config.ts` is what keeps vitest's rules off
  it.** The suites here are named `.spec.ts` too, since 2026-09-15, so the override's own glob no
  longer separates the two — and a Playwright file under vitest's rules reports against a framework
  it is not using. The vitest workspace is `packages/*` and `apps/server`, so nothing collects it
  as a unit test either way.
- **One test asserts the privacy claim, and it belongs to the recording rather than to the page.**
  `sends nothing anywhere while drawing every card` records every request made while cycling all
  eight and fails on any that leaves the origin — **and on any that reaches `/api/**`**, which an
  instance's cards do and the origin check alone would miss. It states which source is drawing
  before asserting it, because the claim is only that source's to make.
- **The privacy test compares origins, not URL prefixes.** It matched
  `request.url().startsWith(page.url().split('/github-stats-forge')[0])`, which re-read `page.url()`
  per request and counted the site's own `/_astro/` chunks as offsite the moment a new chunk
  appeared. `new URL(...).origin`, taken once, is the check.
- **The clipboard needs permission granting, and the download needs fetching.** A copy test is
  `context.grantPermissions(['clipboard-read', 'clipboard-write'])` and then
  `navigator.clipboard.readText()`; the download's bytes are only reachable by `fetch`ing the blob
  URL off the anchor from inside the page, which is also what proves the href is rebuilt per redraw.
- Two locator traps, each already paid for:
  - **The drawn card is `[data-anvil="preview"] > svg`, a direct child.** A card's own icons are
    `<svg>` too, so a descendant selector matches several and every assertion fails on strict mode.
  - **`hide_title` does not remove the card's name from its text.** The `<desc>` an assistive reader
    gets still carries it, so assert on `getByTestId('card-title')` rather than on the card's text.
