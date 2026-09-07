# CLAUDE.md

Guidance for Claude Code when working in this repository.

This file is written in the spirit of **compounding engineering** — the practice of
turning every code review, bug, and correction into a permanent lesson the tooling
applies automatically, so each unit of work makes the next one easier rather than harder
([Every, _Compound Engineering: How Every Codes With Agents_](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents);
[guide](https://every.to/guides/compound-engineering)). Practically: when a reviewer
pushes back, a rule lands here — not in a chat message that evaporates. Each rule below
cites the incident that produced it, because the incident is what makes it stick.

Scope split: **this file holds the durable rules**; work not yet done lives in
`.claude/scratch/` (untracked). Rules go here, pending work goes there; don't duplicate
across the two. Open at the moment: `CORE_DEFERRED_IMPROVEMENTS.md` (follow-ups in
`packages/core`, each verified as still applicable), `CORE_PACKAGE_SPLIT.md` (whether
`packages/core` becomes several packages), `ANVIL.md` (the docs site's card builder,
which writes the CLI's config file) and `SERVER_DOCKER.md` (an HTTP server
over the api handlers, shipped as an image).

## What this is

`github-stats-forge` — a pnpm monorepo holding the library that renders
GitHub stats as SVG cards, the CLI that writes one to a file, and the site that documents
both. The server that used to live here is gone: consumers (the GitHub Action, any
self-hosted endpoint) import the package.

| Path            | What it is                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `packages/core` | The library: fetchers, card renderers, themes, api handlers                                               |
| `packages/cli`  | `github-stats-forge`: prompts through a card's options, writes the SVG, saves and reloads a card's config |
| `apps/docs`     | The documentation site — Astro + Starlight, every page markdown; **not published**                        |
| `scripts/`      | Repo-level tooling — `assert-deduped.ts`, via `tsconfig.scripts.json`                                     |

**The workspace is `packages/*` and `apps/*`.** A package under `packages/` is published and
carries a changeset; an app under `apps/` is not and does not. `build:packages` and
`lint:publish` stay filtered to `./packages/*` for that reason; the root `typecheck` covers the
packages and `scripts/`, and the site's own runs in CI's docs job.

`packages/core/src` is laid out as `fetchers/` (network) → `cards/` (SVG render) →
`api/` (query-string handlers), with `common/` for shared helpers, `themes/` for the
theme table and `graphql/` for query text and its generated types.

**A card is a folder under `cards/`**, holding its renderer as `index.ts` and its
translations as `locales.ts`; only `cards/options.ts` sits loose beside them. The tables
were one `src/translations.ts` until 2026-09-07 — a file no card owned, which every card
had to be read alongside.

**Every source file is TypeScript.** The generators under `packages/core/scripts/` were
the last `.js` holdouts and became `.ts` on 2026-09-03, which also put them under
`packages/core/tsconfig.scripts.json` — so CI typechecks them now.

## Commands

Run from the **repo root** unless stated otherwise.

```sh
pnpm test                 # vitest, whole workspace
pnpm test:coverage        # vitest with the coverage config
pnpm typecheck            # build, then tsc over the packages and scripts/
pnpm lint                 # oxlint over the whole workspace
pnpm lint:ci              # oxlint --format=github (what CI runs, for annotations)
pnpm lint:fix             # oxlint --fix
pnpm lint:knip            # unused files/exports/deps
pnpm lint:deps            # scripts/assert-deduped.ts — fails on duplicated deps
pnpm lint:publish         # attw + publint in each package — guards what gets published
pnpm format               # oxfmt --write . (`format:check` in CI)
pnpm build:packages       # build packages/*
pnpm cli --help           # build, then run the CLI (add any of its flags)
pnpm run docs             # build, then the docs site's dev server (`run` is required — see below)
pnpm docs:build           # build the docs site (what CI runs)
pnpm docs:cards           # build, then redraw the docs site's card previews
pnpm docs:e2e             # build the site, then run the anvil's browser tests
pnpm check-all            # every check CI runs, cheapest first, in one command
```

**`pnpm run docs` needs the `run`, unlike every other script here.** `docs` is a pnpm builtin
(`pnpm docs <package-name>`), so bare `pnpm docs` never reaches the script and fails with
`ERR_PNPM_MISSING_PACKAGE_NAME` — from the repository root, where the script plainly exists. The
`docs:*` scripts are unaffected, being no one's builtin. Confirmed on pnpm 11 on 2026-09-07, after
the bare form was documented here and did not work.

`check-all` is the one to reach for before handing work over. It is
`scripts/check-all.ts` — thirteen checks ordered so the fastest failure surfaces first, each
named and timed, stopping at the first failure unless `-k` asks for the whole list. It was an
`&&` chain in `package.json` until that reached eleven links; a `.sh` was considered and
rejected, because every other file here is TypeScript and so gets typechecked, linted and
formatted. It does not build separately, because `typecheck` already does. Keep the list in
step with `.github/workflows/ci.yml` — a check that runs in CI and not here is a check that
fails after the push instead of before it.

Per-package: `pnpm exec tsc -p tsconfig.typecheck.json`.

**A lint script is per-package only when the tool is.** oxlint reads one root config and
sweeps the workspace in a single pass, so it has no per-package script and never will.
`lint:publish` is the opposite: `attw --pack .` and `publint` each examine one tarball,
so each package owns the script and the root one is
`pnpm -r --filter "./packages/*" run lint:publish`. That way a third package is covered
the day it appears, rather than the day someone remembers to add it to a hardcoded list.

**Task ordering is `pnpm -r`'s, not a task runner's.** `pnpm run -r` walks the workspace
in topological order, so `build:packages` builds core before cli for free. `typecheck`
spells out its one extra edge by building first: each package's `tsconfig.typecheck.json`
clears `customConditions`, so cli resolves core through its built `.d.ts`.

**turbo was removed on 2026-09-04, after being measured.** It owned exactly these two
tasks, and its own startup cost more than the `tsc` builds it ordered — 2.0s cold against
1.3s for plain `pnpm -r`, with a warm cache hit at 0.6s saving under a second. CI never
collected even that: there was no `actions/cache` step and no remote cache, so all four
matrix jobs paid the cold-run penalty. It also cost the poisoned-cache session recorded
under "tsconfig layout and emit". Don't reinstate a runner for two packages; if the
package split lands, measure again rather than assume.

GraphQL types are generated, so run these from the repo root after touching any
`src/graphql/queries/*.graphql`:

```sh
pnpm --filter ./packages/core/ run generate-graphql-types   # rewrite src/graphql/generated
pnpm --filter ./packages/core/ run check-graphql-types      # what CI runs; fails on drift
```

The root `vitest.config.ts` is a `projects` workspace over `packages/*`. Running
`pnpm exec vitest` inside a package also works and is the quick way to iterate on one
suite. A package that imports another resolves it through the `@stats/source`
condition, which vitest only applies when it is set under **`ssr.resolve.conditions`**
as well as `resolve.conditions` — see `packages/cli/vitest.config.ts`.

## The documentation site

`apps/docs` is Astro + Starlight, served under `base: '/github-stats-forge'` because GitHub Pages
puts it below the repository name. It is **not published to npm**, so it carries no changeset and
no `lint:publish`.

- **Every documentation page is markdown, the landing page included.** `.astro` exists for the
  config, the plugins, the two Starlight overrides and the anvil, nothing else. A documentation page
  that wants a component is a page that wants rewriting — this was the whole point of phase 1.
  - **The anvil is the one exception, because it is an application rather than prose.**
    `src/pages/anvil.astro` renders through Starlight's own `<StarlightPage>`, so it keeps the
    header, the nav and the theme while living outside the content collection — which is what lets
    it carry a `<script>`. It is also the only page here that ships JavaScript. Two consequences:
    the remark plugins do not run on it, so its links spell out `BASE` themselves rather than being
    written relative; and **nothing validates those links** — `starlight-links-validator` collects
    links through a rehype plugin over the markdown content, so a dead link or a dead `#hash` in
    `anvil.astro` builds green. Proved on 2026-09-07 by pointing one at a heading that does not
    exist. Check the anvil's own links by hand, and note that a markdown page linking _to_ `/anvil/`
    would be reported as "invalid link to custom page" — no docs page does today.
- **`/` is a landing page and every documentation page lives under `/docs/`.** The tree is
  `src/content/docs/index.md`, `src/content/docs/docs/**` for the documentation and
  `src/pages/anvil.astro` beside it at `/anvil/`, which is why the sidebar entries all read
  `docs/…`. **The two pages outside the documentation tree carry `template: splash`**, which is
  what drops Starlight's sidebar and table of contents: the sidebar lists the docs, so it has no
  business on the landing page or the anvil. Three things follow from that split, each already paid for once:
  - **The landing page has no hero image.** Astro hands one to sharp, which is not installed and is
    not worth installing for an icon the header already shows.
  - **Its call to action is markdown links in a `<div class="hero-actions">`, not `hero.actions`.**
    Frontmatter never reaches `remark-resolve-links`, so a `hero.actions` link to `/docs/` would
    have to spell out the base — and the validator rejects it relative. The div is the same trick
    `card-row` uses, styled by `src/styles/home.css`.
  - **`routeOf` in `remark-resolve-links` strips `index` at any depth**, not just at the root:
    `docs/index.md` is served at `/docs/`, and until this moved it resolved that page's own links
    against `/docs/index/`.
- **A card example is rendered by the CLI, never hand-drawn and never fetched at build time.**
  `apps/docs/cards/*.json` holds a saved card without a theme; `pnpm docs:cards` renders each one
  twice, once per site theme, into `apps/docs/public/cards/<name>-{light,dark}.svg`. Those SVGs are
  committed, so the build needs no `PAT_1` and CI can run it.
- **One image in the markdown, two in the page.** `src/plugins/rehype-card-previews.ts` turns
  `![alt](/cards/<name>.svg)` into the light and dark pair, adds the base path, reads `width` and
  `height` off the SVG so nothing shifts as it loads, and marks the dark copy `aria-hidden` with an
  empty `alt` because only one of the two is ever shown. It **throws when the pair is missing**,
  which is why `docs:build` runs in CI: a page referencing an unrendered card fails the build.
- **Each fetcher has its own page, and `<!-- api: fetchStats -->` becomes its reference at build
  time.** `remark-fetcher-reference.ts` expands the marker; `fetcher-reference.ts` reads the
  summary, the `@returns`, the return type and every option — name, type, whether it is optional,
  and whatever `/** */` sits on its declaration — through the TypeScript checker. Prose around the
  marker is hand-written. **Nothing is generated onto disk**, so there is no `--check` and no way
  to be stale; the build is the check. A fetcher exported from core with **no page fails the
  build**, naming the file to write — that is how a new one gets documented rather than dropped.
  - It was a committed generator with a `--check` for one commit, and became a plugin because
    opening core's project costs 110ms and reading all seven fetchers costs 4ms. At that price,
    making staleness impossible beats catching it.
  - **`astro dev` does not pick up an edit to core's doc comments. Restart it, and do not build
    machinery to avoid that.** Astro re-renders a page when its own markdown's digest changes, and
    a doc comment in `packages/core` does not touch that, so the content layer keeps serving what
    it rendered at startup. Live refresh **was** built — a loader wrapping `docsLoader()` that
    drops the `fetchers/` entries, plus an integration calling `refreshContent` from
    `astro:server:setup` — and worked, and was deleted on 2026-09-06: 81 lines and two novel
    concepts to save a restart, on pages whose reference is mostly type signatures. Rebuild it
    only if that trade has changed. The note lives in `remark-fetcher-reference.ts` too, which is
    where someone hits the problem.
    - Three simpler routes fail outright, so don't reach for them either: the store's own mtime
      always looks newer (every run rewrites it); deleting `data-store.json` under a running
      server empties the collection, and Starlight then fails on the first slug it looks up; and
      `server.restart()` never re-runs `astro:config:done`.
  - **The whole feature is 261 lines to keep 48 option rows honest, 42 of which have no
    description in core and render as `—`, while 75 hand-written option rows on the card pages
    have no protection at all.** That imbalance was argued through on 2026-09-06 and the smaller
    half was cut. Weigh it again before extending this to the cards; a hand-written table with
    real prose beats a generated one full of dashes.
  - The extractor caches on the newest mtime under `packages/core/src/fetchers`, so a build opens
    core's project once.
  - It rides `typescript/unstable/sync`, unstable by name — the docs build is what notices a
    TypeScript release moving it. TypeDoc was the obvious alternative and is unusable: its peer
    range stops at TypeScript 6, and `strictPeerDependencies` turns that into a failed install.
  - The plugin parses its markdown with `this.parse`, the processor's own parser, so a table in
    the reference is a table on the page without a markdown-parsing dependency of its own.
- **The GitHub Action is the recommended way to use the cards, and the site says so without
  documenting it.** The landing page, the overview, `usage/cli.md`, `usage/library.md` and
  `usage/in-your-readme.md` each name it and link to
  `https://github.com/stats-forge/github-stats-forge-action`, which is where its inputs are
  documented. A page of our own was written on 2026-09-06 and deleted the same day: the action is a
  sibling repository, so nothing here can check a restatement of its inputs against its `action.yml`
  and it would drift silently. Link to it; do not copy it.
- **`customization/themes.md` is generated** by `scripts/generate-themes-page.ts` from core's own
  theme table, and `check-themes-page` fails on drift, exactly as the GraphQL types do. The
  generator formats its output through oxfmt's API — same reason as the GraphQL generator — so
  `pnpm format` leaves it alone and `--check` compares against what the formatter would write.
  Never hand-edit that page.
- **Pages link to each other relatively, and `remark-resolve-links.ts` turns those into real URLs
  before anything else sees them.** `base` is a deployment detail and stays out of the prose;
  the plugin resolves `../cards/stats/` against the page's own route and prefixes the base, so the
  browser gets `/github-stats-forge/cards/stats/` and `starlight-links-validator` gets something
  it can check.
  - **That plugin is what makes link validation real.** The validator **cannot resolve a relative
    link** — it skips it — so `errorOnRelativeLinks: false`, which the site ran with until
    2026-09-06, exempted all 58 internal links while the build still printed "All internal links
    are valid". A deliberately dead link proved it. The option is back at its default now, and
    nothing reaches it relative.
  - Two other routes were tried and do not work: writing the base into every link (rejected — it
    hardcodes where the site is served into the content), and `./page.md` links, which Astro does
    not rewrite.
  - It runs as a **remark** plugin, because Starlight appends its own plugins after the ones on the
    processor: the validator collects links after this has rewritten them. In rehype it would be
    too late.
- **The header carries a top nav, because Starlight has none.** `src/components/SiteTitle.astro`
  overrides Starlight's own to put "Docs" and "Anvil" beside the title; the anvil is therefore
  **not** in the sidebar. A section is marked `aria-current="page"` when the pathname starts with
  its own href, so the landing page marks neither — the title is the link home. The links are
  centred against the title with `align-self`: `.title-wrapper` is a flex row that stretches its
  items, which left them riding the top of the header with their underline at its foot.
- **`SocialIcons` is overridden only to open the links in a new tab.** Both leave the site, and
  Starlight's own renders them with no `target`. The override is its markup and its styles copied,
  plus `target="_blank"`, `rel="me noopener"` and "(opens in a new tab)" in the screen-reader label
  — so re-copy it from `@astrojs/starlight/dist/components/SocialIcons.astro` if Starlight changes
  that component.
- **A theme sample is one image, a card preview is two.** The plugin renders
  `/themes/<name>.svg` once — it already names its theme — and pairs `/cards/<name>.svg`.
  `SAMPLE_THEMES` in `src/constants.ts` is read by both generators, so the page cannot draw a
  theme nobody rendered.
- **The header logo is the repository's own `.github/assets/appIcon.svg`**, referenced from
  `astro.config.ts` rather than copied. `public/favicon.svg` **is** a copy of it, because a favicon
  has to be a static file at a stable URL — change one and change the other.
- **A diagram on the site is a fenced `text` block, not mermaid.** Rendering mermaid costs either
  a client-side bundle on a docs half that ships no JavaScript, or `@mermaid-js/mermaid-cli` and
  the Chromium it brings with it. Neither is proportionate to a diagram; the colour-precedence one
  on `light-and-dark.md` is the shape to copy.
- **`vite.optimizeDeps.include` names `zod/mini`, and `astro dev` needs it.** Vite's startup dep
  scan does not follow into a workspace-linked package, so core's only runtime dependency was
  discovered at the first request instead. The optimizer then re-ran mid-serve and stranded every
  already-served module at a superseded `?v=` hash — Astro's dev-toolbar entrypoint among them,
  which answered `504 Outdated Optimize Dep` on every page of the site, the markdown ones included.
  - **`zod` is a direct devDependency of `apps/docs` for this**, even though nothing here imports
    it: an `include` naming a package that does not resolve from the app is **silently dropped**.
    `knip.jsonc` lists it under `ignoreDependencies` for the same reason.
  - **A warm `node_modules/.vite` hides it**, because nothing is discovered late and nothing
    re-optimizes. Clear it before concluding anything about this — a `devToolbar: { enabled: false }`
    workaround and a `configEnvironment` plugin were both adopted and reverted on 2026-09-07 partly
    because cold-versus-warm runs read as flakiness.
  - **Measure it through a browser, not `curl`.** The optimizer only discovers a client dependency
    once the module importing it is requested, so fetching a page's HTML never triggers it and
    always answers 200. That mismeasurement cost six failed attempts at a minimal reproduction.
  - **Upstream: [withastro/astro#17929](https://github.com/withastro/astro/issues/17929)**, filed
    from `~/development/astro-devtoolbar-504`. Root cause: `.astro` files are missing from the
    client `optimizeDeps.entries`, so `<script>` imports are never scanned at startup. The proposed
    one-line fix (`pkg.pr.new/astro@da57267`) was verified here against the real trigger with the
    workaround removed: entrypoint 200, zero failed requests, cold. **When a release carries it,
    delete the `zod/mini` include, the `zod` devDependency and the `knip.jsonc` entry.** Related,
    closed: withastro/astro#16630.
- **`apps/docs` pins every dependency exactly**, as the rest of the repo does with its dev
  dependencies. It is private, so nothing resolves a range on a consumer's behalf.
- **`astro sync` has to have run before anything type-aware does.** `content.config.ts` imports
  `astro:content`, a virtual module with no types until sync writes `.astro/types.d.ts`, and
  without them the type-aware rules report `no-unsafe-call` on `defineCollection`. `check-all`
  starts with `docs:sync` and CI does the same before its Lint step. PR #50 found this: green
  locally, red on a fresh checkout. When that happens again, delete `apps/docs/.astro` and
  `packages/*/build` and run it again — that is what CI has.
- **The site typechecks against core's source, not its build, and so has no
  `tsconfig.typecheck.json`.** Clearing `customConditions` is how a _published_ package proves a
  consumer can resolve it; `apps/docs` is not published and not that consumer, and `packages/cli`
  plus `lint:publish` already make that case. Keeping the `@stats/source` condition means the
  editor and CI agree. **Typechecking needs nothing built; the site's `astro build` does** — see
  `docs:build` below.
- **`.astro/` is `astro sync` output**: gitignored, and ignored by oxlint and oxfmt. Do not lint
  or format it, and do not commit it.

## The anvil

`/anvil/` is the site's card builder: a form over a card's options, the card redrawn beside it, and
the file the CLI's `--config` reads. Renamed from "wizard" on 2026-09-07, because the sibling
`ghse` already has one.

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
  `pnpm --filter ./apps/docs run record-anvil-samples` drives the same six handlers with a `fetch`
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
- **A card is drawn into a shadow root, because an inlined SVG's `<style>` is document-wide.**
  A card carries its own CSS, and inlining the SVG into HTML does not scope it: the stats card
  defaults `show_icons` off, which emits `.icon { display: none }`, and that hid **every** `svg.icon`
  on the page — the theme switcher in the site header among them. `attachShadow` is the only thing
  that keeps a card's styles inside the card, and core has no `:host` rules, so nothing changes
  appearance by moving there. The card sits under an `.anvil-card` wrapper inside that root, which
  is what gives it a selectable handle — a card's own icons are `<svg>` too. Playwright's CSS
  selectors pierce an open shadow root, so the tests needed nothing but the new path.
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
- **The option catalog is the CLI's, imported rather than restated.** `packages/cli` exports it at
  `./cards` — `cards`, `findCard` and `COMMON_OPTIONS` — carrying every option's name, label, kind,
  hint and choices, and reading its choices off core's `OPTIONS` so no list is copied anywhere. Two
  forms over the same options are not two lists. What `apps/docs` adds is only what the CLI has no
  use for: each card's sample identity, which half of every theme pair it wears, and the `maximal`
  params the recorder needs. That overlay **throws when a card in the catalog has no entry**, so a
  card added to the CLI is noticed here rather than silently undrawable.
  - The catalog imports nothing but core's public api, so pulling it into the browser costs a few
    hundred bytes and no CLI machinery.
  - A control is chosen by the option's `kind`: `boolean` a `wa-switch`, `choice` a select, a `list`
    with choices a group of checkboxes, and everything else a field — numeric where the kind says
    so. The options every card shares are folded into a `wa-details`, because thirty controls in one
    column is a wall.
- **The site bundles `packages/core` and the CLI from source, through `@stats/source`.**
  `astro.config.ts` sets that condition under **both** `vite.resolve` and `vite.ssr.resolve`, the
  same trap `packages/cli/vitest.config.ts` documents. Keep both.
  - **It does not reach the client build, so `docs:build` builds the packages first.** Rolldown
    resolved neither `@stats-forge/github-stats-forge-core/api` nor the CLI's `./cards` from
    `src/anvil/cards.ts` on a fresh checkout, whichever came first in the file — the condition is
    honoured for typechecking, for `ssr`, and for the scripts that pass `--conditions`, but not for
    the browser bundle. `environments.client.resolve.conditions` does not help either.
  - So **`docs:build` is `build:packages && astro build`**, which is what `docs` and `docs:cards`
    always did; `docs:build` was the odd one out and only ever passed locally because `build/`
    happened to exist. It broke CI's docs job on the first run that had no `build/` — PR #58. When
    a docs step passes locally and fails in CI, delete `packages/*/build`, `apps/docs/build` and
    `apps/docs/.astro` and run it again.

### The anvil's controls

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

### The anvil's browser tests

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
- **`@playwright/test` is pinned at 1.62.1, which is not the latest.** 1.63.0 was two days old and
  `minimumReleaseAge` is three, so pnpm refuses it. Take the newest version older than the
  cooling-off period rather than adding it to `minimumReleaseAgeExclude` — that list is for a
  first-party publish waiting out its own rule.
- **The file is `.spec.ts`, deliberately.** The vitest workspace is `packages/*` so it would not
  collect it anyway, but oxlint's vitest override is `**/*.{test,bench}.ts`, and a Playwright file
  under those rules reports against a framework it is not using.
- **One test asserts the privacy claim.** `sends nothing anywhere while drawing every card` records
  every request the page makes while cycling all six, and fails on any that leaves the origin. The
  page tells the reader nothing they type is sent anywhere; this is what makes that true rather than
  stated.
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

## Working agreements

- **Don't commit or open PRs unless asked** — the repo owner usually does that. Leave
  changes in the working tree, and when a branch is wanted, say which commits are on it.
- **A change to `packages/*` carries a changeset, written without being asked.**
  Add it to `.changeset/` as part of the same change, not as a follow-up:
  the published `CHANGELOG.md` is generated from these files,
  so a package change shipped without one is invisible to consumers.
  - **The summary's first line is a conventional commit** — `refactor(core)!: …`,
    `feat(cli): …`, `ci: …` — because it lands verbatim in the changelog
    (see the 0.0.2 entry in `packages/core/CHANGELOG.md`).
    Blank line, then the prose.
  - **The packages are pre-1.0, so a breaking change is `minor`**, not `major`:
    changesets would read `major` as 0.0.2 → 1.0.0.
  - **A dependent package needs no entry of its own.**
    `updateInternalDependencies: patch` bumps it, so removing core's root entry
    patched the CLI without the changeset naming it.
    Confirm with `pnpm exec changeset status` before committing.
  - A pure tooling change that leaves the published output alone can go without one —
    that is the owner's call, so ask rather than assume.
- **Keep this file current.** When a rule here stops matching the repo, fix it in the
  same change that broke it; no need to ask first. The rules earn their keep only while
  they are true, and a stale rule is worse than no rule.
- **Every untracked working file lives in `.claude/scratch/`** — review replies, design
  plans and pending-work lists, all in one ignored folder instead of scattered across the
  repo root. This file is the exception: `CLAUDE.md` stays at the root, the only project
  path Claude Code loads on its own.
- **Don't call the person reading the docs "the reader".** It is uncommon phrasing for
  documentation, and it was doing two different jobs: where the subject is really the user agent it
  is **the browser** (`the browser's colour scheme`, `wider than the browser window`), and where it
  is a person it is **you**, **anyone** or **a visitor** (`a visitor to your profile fetches the
SVG`). Fourteen uses across five pages were rewritten on 2026-09-07. **`screen reader` stays** —
  it is the standard accessibility term, and `assistive reader` was normalised to it.
- **Break a line after its punctuation — but only where it has to break.**
  Fill to the print width first: a thought that fits on one line stays on one line.
  Where it does not fit, start the next line after the full stop, colon, dash or comma
  that ends the clause, never mid-sentence, so a later edit touches one line in the diff.
  This governs prose in markdown as much as comments in code: sentence-per-line was
  applied to the examples README on 2026-09-02 and corrected the same day —
  the rule is where a break lands, not that every sentence earns one.
  **Every file the repo writes prose into is in scope, a changeset and a commit message
  included** — a changeset summary written on 2026-09-03 wrapped mid-phrase and had to be
  rewrapped, and it lands verbatim in the published `CHANGELOG.md`. The existing
  changesets are the reference: each break falls on a comma, colon or full stop, and a
  long clause is allowed to run past the width rather than be split.
- **`apps/docs/public/cards` is committed, so redraw it when a card's output changes.**
  `pnpm docs:cards` renders every saved card in `apps/docs/cards` through the built CLI, twice
  each; it needs `PAT_1` in a root `.env`, which is why CI cannot keep the previews current.
  The SVGs carry live stats and drift on their own — that is expected, and not a reason to
  regenerate them in an unrelated change.
  **`examples/` was deleted on 2026-09-05**, when the site took over showing a card of each kind.
- `.claude/scratch/CORE_DEFERRED_IMPROVEMENTS.md` lists the follow-ups `packages/core`
  still owes. Check it before starting work there, and keep it current as they land.

## Comments

**A comment states the reason, never the behaviour.** Write it, then delete every
sentence the reader could have got from the code itself; what survives is usually one
line. A comment that only announces what the next block does is not worth keeping.

**There are no `@param` tags in this repository; `@returns` stays.** 566 `@param` lines
were deleted on 2026-09-03 across 56 files, because under TypeScript they restated the
signature and nothing checked them — eslint's `jsdoc/check-param-names` kept the
`@param props.x` paths honest, and oxlint has no equivalent, so they were free to rot.
A return value has no name in the signature, so its description is the one tag that
still earns its place. What replaced the rest:

- **A doc block is a summary, then `@returns`.** One or two sentences on what the
  function is for, plus `@see` / `@example` / `@deprecated` where they earn it.
- **A note about one parameter or property goes next to that declaration, as a `/** */`**
  — not as a tag far from the thing it describes, and not as a `//` line comment, which
  no editor surfaces on hover. `createProgressNode`'s `color?: string` carries
  `/** When omitted, the color must be set via a '.lang-progress' CSS rule. */` this way,
  and so do the parameters of `errorResult`, `approxNumber` and
  `fetchAllTimeReposContributedTo`.
- **Keep what the type cannot say.** A range (`0 <= n < max`), an ordering, a unit, a
  fallback, a format guarantee (`.svg`), or a side effect (`main` sets a non-zero exit
  code rather than throwing) belongs in the summary or the `@returns`, never dropped
  because the signature "looks obvious".
- **Mind multi-line tags when stripping them mechanically.** `api/api-result.ts`,
  `common/error.ts`, `common/render.ts`, `fetchers/stats.ts` and `tests/utils.ts` each had
  a `@param` whose text ran onto a second line; deleting the tag line alone left the
  continuation orphaned under the summary. Audit the diff for removed lines that are not
  tags or delimiters.

**Domain interfaces** (`CardColors`, `Config`, …) — data shapes that aren't one
function's parameter object — document their members inline with `/** */`.

**oxlint's `jsdoc` plugin holds the line, as far as it can.** `check-tag-names`,
`empty-tags` and `no-blank-blocks` are on and clean. `require-returns-type` stays off —
it wants `@returns {Type}`, which the signature already carries, and would flag all 171
tags. `require-returns` is off too: it would demand a tag on 26 functions that never had
one, which is a bigger decision than a lint rule should make on its own.

## Linting and formatting

**oxlint replaced eslint on 2026-09-03.** `oxlint.config.ts` at the root extends
`@marcalexiei/oxlint-config` (`base` + `typescript`, and `vitest` in an override for
`**/*.{test,bench}.ts`), and runs **type-aware** via `oxlint-tsgolint`. `oxfmt`
formats, configured from `@marcalexiei/oxfmt-config`.

Both configs are the repo owner's own packages, developed in a sibling checkout of
`void-0-configs` and published to npm. **When the shared config is wrong, fix it there**
rather than working around it here — three bugs were found and fixed upstream during the
migration, including a `vitest` config that enabled the `jest` plugin alongside it and so
reported all 49 shared rules twice.

- **Every local override carries its reason, in the config.** `oxlint.config.ts` splits
  them into "tuned to what this repository is" and "off, each for a reason this repository
  owns", one comment per entry. An override with no reason is a rule someone silenced.
- **`reportUnusedDisableDirectives` is `error`.** An `oxlint-disable` that stops being
  needed fails the build, so the handful in the tree stay honest.
- **Prefer a rule option to switching a rule off.** `id-length` keeps `properties: 'never'`
  and a list of the single letters SVG, colour channels and comparators actually use;
  `prefer-nullish-coalescing` keeps `ignorePrimitives: { string: true }` because a query
  param arrives as `''` when empty, so `||` is what falls back to the theme.
- **`unicorn/prefer-number-coercion` is off for a behavioural reason.** It rewrites
  `Number.parseFloat(x)` to `Number(x)`, which would break `?border_radius=10px`.
- **`import/no-cycle` is fully enforced, with no exemptions.** The `fmt` ↔ `render` cycle
  that once needed two disable directives was untangled on 2026-09-03 by moving
  `wrapTextMultiline` into `render.ts`, so `fmt.ts` no longer imports back.
- **The autofixer is not a review.** `oxlint --fix` is worth running, but it converted an
  array to a `Set` without updating its `Array<string>` annotation, and stripped explicit
  `undefined` arguments that a required parameter still needed. Typecheck and test after
  every `--fix`, and read the diff.

## Dependencies and pnpm

pnpm is **11.x**. The v11 rename of `onlyBuiltDependencies` to the `allowBuilds` map is
the one that bites: the old key stops applying silently, so a package's install scripts
are skipped until it is listed again.

- **`allowBuilds` holds only packages still in the graph.** It is `lefthook` and — since the docs
  site landed on 2026-09-05 — `esbuild` again, which astro pulls in and which fetches its platform
  binary in a postinstall. `@swc/core` and `unrs-resolver` were removed as each left. Check with
  `pnpm why <pkg>` before adding or keeping an entry.
- **A stale lockfile can hold a package nothing depends on.** `esbuild` survived as an
  optional peer of `vite` long after vite moved to rolldown. Deleting `node_modules` **and**
  `pnpm-lock.yaml` and reinstalling dropped it and six others; deleting the lockfile alone
  does not, because pnpm reuses what is already installed.
- **`minimumReleaseAge` is 4320 minutes (3 days), deliberately stricter than the default.**
  A package published minutes ago cannot be installed, which is why a fresh release of a
  first-party config is excluded by exact version in `minimumReleaseAgeExclude` — the
  cooling-off period is there to catch a third-party publish going bad. Pin the version in
  the exclusion; a bare package name would exempt every future publish too.
- `strictPeerDependencies` and `engineStrict` are on, so an unmet peer fails the install
  rather than warning.

## TypeScript conventions

`packages/core` and `packages/cli` are `.ts` throughout, source, tests and scripts alike.
TypeScript is **7.x**; the type-aware linter tracks the same major, so `tsc` and
`oxlint-tsgolint` agree on semantics.

`tsconfig.base.json` is strict and then some — `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noUnusedLocals`,
`noUnusedParameters`, `verbatimModuleSyntax`, `isolatedModules`, `module: nodenext`.

**A relative import names the file that exists, so the extension is `.ts`.** This was
`.js` until 2026-09-04, when 375 specifiers across 76 files were rewritten; the pair of
options that allows it is `allowImportingTsExtensions` plus
`rewriteRelativeImportExtensions`, both in `tsconfig.base.json` — the first alone demands
`noEmit`, which the two `tsconfig.build.json` are not. What it bought is `pnpm dev` with
no build step. Three things to know before touching it:

- **Only the `.js` emit is rewritten. The `.d.ts` emit is not.** A declaration in `build`
  still reads `from './x.ts'`, naming a file the tarball does not contain. `tsc` resolves
  it to the sibling `.d.ts` anyway, and `attw` reports both packages green — which is why
  `lint:publish` exists and runs in CI. Do not "fix" those specifiers by hand, and do not
  drop that check: it is the only thing standing between this convention and a consumer
  whose toolchain is less forgiving than `tsc`.
- **The GraphQL generator carries the extension in two places.** `importExtension: '.ts'`
  and the `prepend` literal in `packages/core/scripts/generate-graphql-types.ts`. Nothing
  fails until someone regenerates, so change them with the convention, not after it.
- **`noCheck: true` in the build configs means a green build proves nothing here.** Run
  `pnpm check-all`.

**Never widen a signature just to keep an old test compiling — adapt the test to the
code.** Type every function to the contract its _production_ call sites actually use. If
a test called it with something looser, fix the test. This was a real regression: the
top-languages conversion typed
`trimTopLanguages(topLangs: TopLangData | Array<Lang>, langs_count?: number)`, where the
union and the `?` existed only because the old tests passed bare arrays and omitted the
count — the card itself always passes a `TopLangData` and a `langs_count`. A maintainer
had to follow up in upstream PR #476 ("adapt tests to code") to narrow it back to
`(topLangs: TopLangData, langs_count: number)` and rewrite the three test calls. The same
applies to `?: T | undefined` widenings and `Partial<…>`: add them only when a real
caller forwards `undefined`, never to appease a fixture.

Other patterns:

- **Declare only the params you actually read — and validate nothing you do not use.**
  `locale` sat in `CommonCardOptions` and `api/gist.ts` both forwarded and validated it,
  yet the gist card had no translated text and never read it, so `?locale=xx` returned
  "Language not found" for an option that could not have changed the output. It moved to
  the card options that do read it. It is on all six today, because the gist and
  contributed-to cards had their last English literals put through `I18n` on 2026-09-05 —
  the rule is that the option follows the reading, not that any given card has one.
- **Colocate card options.** Each card declares `interface XCardOptions extends
CommonCardOptions {…}` (an interface, not `type &`) in its own `index.ts`, **not exported** —
  knip flags it, and only that card uses it. All six cards do this, so
  `cards/options.ts` holds only the shared base: `CommonCardOptions`, plus the
  `CardOptions<T>` helper below. The `ThemeName` union lives in `themes/index.ts`.
- **`CommonCardOptions` extends `ColorParams`.** Every card forwards its whole options
  object into `getLightDarkColors`, so the `_light` / `_dark` colour params are part of a
  card's contract even though no card destructures them by name.
- **If a card exports something another card imports, move it to `common/`** — e.g.
  `createTextNode` moved from the stats card to `common/render.ts`. Ask before moving.
- **One export style per module.** `Card.ts` carried both a named and a default export of
  the same class, and one card imported the default while four imported the name; knip
  flagged the default as unused once that import was normalised, and it was deleted.
- Prefer `Array<T>` over `T[]` (`typescript/array-type: generic`).
- No `string | undefined` or `null` inside template literals
  (`typescript/restrict-template-expressions` with `allowNullish: false`); resolve with `??` first.
- No `@ts-check` / `@ts-ignore` — use real types. For deliberate misuse in tests,
  `// @ts-expect-error <description>` (the description is required by `ban-ts-comment`),
  and delete it once the call becomes valid.
- Unused args are only allowed with a leading `_`.
- Untyped deps with no `exports`-mapped declaration get a `declare module` shim:
  `@uppercod/css-to-object` → `tests/_css-to-object.d.ts` and `emoji-name-map` →
  `src/_emoji-name-map.d.ts` (a runtime dep's shim has to live under `src/` for the build
  config to see it).
- **A dependency whose whole body is one literal gets inlined instead.**
  `github-username-regex` cost a runtime dep, a `declare module` shim and a bullet in this
  file, all to deliver the 87 bytes of `/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i` —
  v1.0.0, published 2017, CC0. It is now `GITHUB_USERNAME_PATTERN` in
  `common/constants.ts` and the shim is gone. Read a small package's source before adding
  it: where copying costs a line and a comment, and the licence allows it, copy it.

### The api layer is the trust boundary

`api/*` turns a query string into card options, so **parse and validate there once** and
hand the render functions typed values — defaults stay with the renderer.

**Each endpoint declares what it accepts as a `zod/mini` schema**, built from the shared
params in `api/params.ts` (`booleanParam`, `listParam`, `numberParam`, `looseIntParam`,
`rawParam`, `safeParam`, `safeListParam`, `localeParam`, `enumParam(values)`,
`fromParam`, `toParam`) — none of which takes a message, because the wording is derived
from the kind and the param name.
A handler is then `cardHandler(xQuery, async (params, colors, config) => svg)` from `api/handler.ts`:
it parses the colors, parses the query against the schema, awaits the render,
and its two `catch`es are the only place `errorResult` is called.
Parsing throws, fetching throws, and one place turns whatever was thrown into the answer.
Six handlers each carried that control flow by hand until 2026-09-05.

- **Colors parse first, separately.**
  A rejected color cannot be used to draw its own error card,
  which is why `cardHandler` runs `parseColorParams` as its own pass and renders that error with no `renderOptions`.
- **The query type comes from the schema.**
  `cardHandler` types the handler it returns as taking `ApiQuery<typeof xQuery>`,
  so no module names the alias; `ApiQuery` itself is what `params.ts` exports.
  A consumer is checked at the call site rather than by importing a type:
  an unknown param or a non-string value is a compile error, and every param stays optional.
- **A card option's accepted values ride on the render function that draws them, in one
  `OPTIONS` object keyed by the option's own name.** Each card ends in
  `Object.assign(renderCard, { OPTIONS: { rank_icon: RANK_ICONS, show: SHOW_STATS, … } })`,
  so a list cannot be found without the renderer it belongs to, and the key says which
  param it governs rather than leaving that to the const's name. The card's union type
  derives from the same const, so the schema cannot drift from what renders. This replaced
  loose module-level exports on 2026-09-05, where a list was findable without its card and
  the CLI kept its own copy of `['short', 'long']` in two places.
- **The api handler forwards `OPTIONS`, and `enumParam` reads it back off the renderer.**
  `Object.assign(renderStats, { OPTIONS: { ...renderStatsCard.OPTIONS, role: OWNER_AFFILIATIONS } })`,
  then `enumParam(renderStatsCard.OPTIONS.rank_icon)` — one spread rather than a line per
  list, so an option added to a card reaches its handler without the handler being edited.
  Only `role` is added there, because affiliations belong to the fetcher's query rather
  than to one card's drawing. A UI reads a param's values off the function it calls:
  `stats.OPTIONS.rank_icon`, `topLangs.OPTIONS.layout`, `pin.OPTIONS.show`.
- **A `listParam` whose values are a closed set sits in `OPTIONS` beside the enum ones.**
  `stats.OPTIONS.show`, `stats.OPTIONS.hide`, `pin.OPTIONS.show` and `role` on the two
  handlers that take one: the schema cannot check a list against them — an unknown value
  is ignored, not rejected — but a UI can offer them, which is what the CLI's checkbox
  prompts read. Each card's `show` checks run through a `shows()` helper typed against its
  own list, and the stats card's `STATS` record is keyed `Partial<Record<StatId, StatItem>>`
  where `StatId` is both lists' unions, so a stat it draws cannot be missing from them.
- **A value set the boundary does not police still belongs on the renderer.**
  `NUMBER_FORMATS` is declared in `common/render.ts`, beside the `numberFormat === 'long'`
  that reads it, and both cards that take the option carry it as `OPTIONS.number_format`.
  `number_format` stays a `rawParam`: anything but `long` reads as `short`, so an unknown
  value falls back rather than failing, and making it an `enumParam` would turn
  `?number_format=xyz` into an error it has never been.
- **One wording per kind of rejection, in one table.**
  `REJECTION_MESSAGES` in `api/params.ts` maps a `Rejection` kind to its message, and the
  param name comes from the issue's own `path` — no schema spells its own name or prose.
  A check declares its kind through `rejects(kind, passes)`, which closes over the kind and
  hands zod the message function. Nothing reads a kind back off an issue, so no metadata
  rides along on it. Only the first rejection is reported: the error card has one line.
- **Everything throws `CardError`** (`common/error.ts`), which carries a `code`, the two
  lines the card draws, and the param at fault. The codes are `invalid_param`,
  `missing_param`, `not_found`, `no_tokens`, `rate_limited` and `upstream`; `retryable` is
  derived from the code by one table, so "can a retry help" is answered once rather than at
  each throw site. `CardError.from(err)` wraps anything else as `upstream`, **which is
  retryable** — so a permanent failure has to throw a `CardError` to be reported as one.
- **`ApiResult` is a union, not a status string.** Success is `{ status: "success", content }`;
  failure is `{ status: "error", retryable, error: { code, message, secondaryMessage, param }, content }`.
  A host branches on `code` / `retryable` instead of matching `"error - temporary"`, and
  never has to read the SVG to find out what happened.
- **A shape check inside a fetcher is not validation.** GitHub's login rules were
  enforced in `totalItemsFetcher` — the REST-search path alone — while the api layer let
  through anything in the safe character set, so `?username=-foo` was rejected mid-fetch
  or not at all depending on which request ran first. The shape now lives in
  `usernameParam`, so the three endpoints taking a GitHub login reject it as
  `invalid_param` once, before any request. The fetcher keeps its own guard —
  `./fetchers` is a public export and that is where the value reaches a URL — but it
  tests the shared pattern rather than a copy.
- **The api parses; the card defaults.** A handler turns strings into typed values
  (`parseBoolean`, `Number.parseFloat`, `toLowerCase`) and stops there — it never supplies
  a fallback the render function already owns. `parseBoolean(x) ?? false` alongside the
  card's own `show_owner = false` is the same default written twice, and card defaults are
  card knowledge anyway (gist's theme default is `default_repocard`, not `default`).
- **Write plain properties, not conditional spreads.** `CardOptions<T>` accepts an
  explicit `undefined`, so a parsed-or-`undefined` local can be passed straight through;
  `...(x !== undefined && { x })` is only needed against a bare `Partial<T>` under
  `exactOptionalPropertyTypes`.
- **A malformed param is `error - permanent`, decided at the boundary.** Reject it next to
  the colour and id checks rather than letting a render-time guard throw into the generic
  `catch`, which labels everything `error - temporary` — a status a host reads as
  "retry may help". `?border_radius=abc` used to surface `Card`'s internal
  `Invalid border radius: "NaN"` as a temporary error; it is now a permanent
  `Invalid number input for parameter "border_radius"`, matching the colour wording. Name
  the parameter, never echo the value.
- **Match the coercion the callee already performed.** `border_radius` is
  `Number.parseFloat`d by `numberParam` because `Card` does
  `Number.parseFloat(String(border_radius))` internally, so `?border_radius=10px` still
  renders `rx="10"`; `Number()` would also have made `?border_radius=` a silent `0`
  instead of an error. This is why `unicorn/prefer-number-coercion` is off.
- **`CardOptions<T>`** (`cards/options.ts`) is `Partial<T>` that also accepts an
  explicit `undefined`. Render functions take it because a handler forwards params that
  may legitimately be absent.
- **Leave `theme` a raw string — `getCardColors` normalises it.** Card options type it as
  `string`, not the `ThemeName` union, because that is what a handler receives and
  `getCardColors` already resolves an unknown name to `themes.default`. Narrowing it at the
  boundary buys nothing and costs a cast; the `isThemeName` guard in `themes/index.ts`
  belongs in `getCardColors`, which is the one place that does the resolving.

### tsconfig layout and emit

**Emit is opt-in.** `tsconfig.base.json` sets `noEmit: true`, and the only configs that
opt back in are the two `tsconfig.build.json` — one per package, byte-identical
(`noEmit: false` + `rootDir: "./src"` + `outDir: "./build"`, plus `declaration`,
`declarationMap` and an emptied `customConditions`). Nothing else in the repo emits.
Don't add `noEmit` to a config that already inherits it, and don't put an `outDir` on a
config that can't emit.

The build config also sets **`noCheck: true`** — `pnpm build` emits without typechecking,
because the `typecheck` task does that separately against `tsconfig.typecheck.json`. A
green build is therefore not evidence the types are sound; run `pnpm typecheck` too. Each
package's `tsconfig.typecheck.json` exists only to clear `customConditions`, so the check
runs against built `.d.ts` the way a consumer would resolve them rather than through the
`@stats/source` condition. **`apps/docs` deliberately has no such config** — it is not published,
so it typechecks against core's source and needs nothing built. Its `astro build` does need it,
which is why `docs:build` builds the packages.

This came from `packages/core/tsconfig.json` — the config the editor and a bare `tsc`
pick up — carrying `outDir: "build"` while including `tests`. Any stray `tsc` in the
package wrote `build/src`, `build/tests` and `build/vitest.config.js`; turbo, which ran
the builds at the time, captured that under its `build/**` outputs and replayed the test
files back into `build/` on every later cache hit, so the build _looked_ like it was
producing them. The cache left with turbo, but the lesson did not: when build output is
wrong, check what the editor's config emits before suspecting the build config.

There are no TypeScript project references anywhere, so don't reach for `composite: true`
— where it used to sit, its only live effect was forcing declaration emit.

### Generated GraphQL types

Query text lives in `src/graphql/queries/*.graphql`, never inline in a fetcher. Each file
generates `src/graphql/generated/<name>.ts`, plus a shared `common.ts` for the enums and
scalars the variables name. **Never hand-edit `src/graphql/generated/**` — change the
query and regenerate;** the folder is committed and both oxlint and knip ignore it, so
nothing else guards it. Derive fetcher types from the generated ones (`RepoInfo` is
`Omit<RepoInfoFragment, …>`) and give a sub-shape a name with a GraphQL `fragment` rather
than a `NonNullable<…>` chain.

A query whose shape is only known at runtime (dynamic aliases, e.g. one
`contributionsCollection` field per contribution year) can't be a static operation, and
GitHub's GraphQL API neither batches requests nor offers an all-time contributions
field — so a single-request fetch forces runtime assembly. Keep it typed anyway: declare
the selection set as a fragment no operation spreads, so the generator still emits its
type, and build the query in a `build<X>Document(…)` module under `src/graphql/` that
returns `graphqlDocument<Result, Variables>(…)` for `createGraphQLFetcher` (see
`contributionsDocument.ts` ← `fetchers/stats.ts`).

The generator emits fragment **types** but not fragment **text**, so such a module has to
repeat the fragment body in its template literal — `contributionsDocument.ts` spells out
`RangeContributions` verbatim while importing `RangeContributionsFragment` from
`generated/stats.ts`. That duplication is unguarded: nothing fails if the `.graphql`
fragment and the copy drift apart, so change both together and keep the comment pointing
at the source.

The alternative — one static `($login, $from, $to)` query fetched per year in parallel —
was tried and dropped: it costs ~1 rate-limit point per account year instead of 1
total. Fetchers still never contain query text.

**A `contributionsCollection` names both ends of its range, always, and spans at most a
year.** GitHub defaults an omitted `to` to a year after `from` — `?commits_year=2024` counted
2 commits made on 2025-01-01 until this was fixed on 2026-09-05 — and refuses a longer range
outright, so `common/date.ts` slices one per calendar year and `aliasedRanges` sends them as
fields of a single request. The vocabulary there is **range, never span**: `from` and `to`,
both ends inclusive, an open one filled from `getWidestRange()` — which is also the bound the
api rejects a date outside of.

The generator (`packages/core/scripts/generate-graphql-types.ts`) is deliberately
dev-only — no codegen dependency reaches consumers. It is covered by
`packages/core/tsconfig.scripts.json`, so `pnpm typecheck` checks it like any other
source file. The repo-root `scripts/` is covered the same way, by `tsconfig.scripts.json`
at the root.

### Strict-mode friction to expect

- `noUncheckedIndexedAccess` makes every index access `T | undefined`. Read-modify-write
  like `lines[i] += s` becomes `lines[i] = (lines[i] ?? "") + s`; a lookup feeding a
  non-optional return needs an explicit guard.
- `noPropertyAccessFromIndexSignature` forbids dot-access on `Record` types — assign and
  read through brackets, or via `Object.entries`/`Object.values`.
- `exactOptionalPropertyTypes` rejects passing `T | undefined` into `?: T`. Declare the
  _receiving_ optional param as `?: T | undefined` when a real caller forwards a
  possibly-undefined value, or `NonNullable<…>` when the value is always present — but
  re-read the widening rule above first.

## The CLI

`packages/cli` is `@stats-forge/github-stats-forge-cli`, whose `bin` (`github-stats-forge`)
points at `./build/index.js`, but `pnpm dev` is
`node --conditions=@stats/source src/index.ts` — no build step, because relative imports
name `.ts` (see below) and Node strips the types. The condition is what makes it resolve
`packages/core/src` rather than core's `build`; pnpm's workspace link is a symlink whose
realpath falls outside `node_modules`, so Node does not refuse to strip types there.

From the repo root, `pnpm cli` builds both packages and runs the CLI there,
so it picks up the root `.env` the way `pnpm docs:cards` does.
Its flags are forwarded, so `pnpm cli --card stats` skips the first prompt.

- **Choices come from core's exports, never a copy.** Every `choices` in `src/cards.ts`
  is `<handler>.OPTIONS.<param>` — `stats.OPTIONS.rank_icon`, `topLangs.OPTIONS.layout`,
  `pin.OPTIONS.number_format` — with `Object.keys(themes)` the one exception, so a prompt
  cannot offer a value the schema would reject and the option's `name` and its `choices`
  key read the same. **No `choices` array is written out here**: a literal in this file is
  a copy that drifts, which is exactly what `['short', 'long']` did in two card entries
  until 2026-09-05.
- **A `list` option with `choices` is a checkbox, not a line of commas.** `show`, `hide`
  and `role` name a closed set, so the prompt offers it and the answer is an
  `Array<string>` that `toParam` joins back. The lists whose values are a repository or a
  language have no such set and stay free text: give a `list` option `choices` only when
  every value it accepts is known. A saved list is split back into its values on read, so
  the boxes reopen ticked.
- **A saved card file is a query string in JSON**: `{ card, options }` with every option a
  string, so it reads like the URL it stands for and survives hand-editing. An option that
  is not a string is dropped on read, because it could not have come off a query string.
  The key is `options`, not `params`, to match what the menu calls them and what a render
  function takes; `params` stays the word for the query on its way to a handler.
- **stdout carries the result; everything else goes to stderr** — the spinner, the error
  report, the status line. The spinner degrades to a single printed line when stderr is
  not a TTY.
- **The menu stays open after a render** and keeps the cursor where it was, because a card
  is rarely right the first time and the point of the option list is to change one thing
  and look again.

## Card branding

**`common/brand.ts` owns how a card looks; a card composes from it.** One font stack, one
type scale (`display` 22 through `micro` 11), one weight table, the three default widths and
the icon each card wears. `TITLE_FIREFOX_SIZE` is the one size off the scale and still lives
there, so "every size a card draws comes from `brand.ts`" holds without an exception to
remember. A card that writes a `font` shorthand, a pixel size or a raw weight
is drifting: before this landed on 2026-09-06 there were three font stacks — two of them
inside the same card — and `.bold` meant 700 on three cards and 600 on a fourth.

- **A default width is `CARD_WIDTH.compact`, `.standard` or `.wide` — 300, 400 or 500.**
  Six cards had five default widths (287, 300, 400, 450, 495) and stacked in a README they
  formed a ragged edge. A layout needing more room takes the next step up rather than adding
  to one: the `donut` moved to `standard` instead of keeping its `+= 50`.
  - **Raising a step can strand the minimum beneath it.** A minimum only ever meets its
    default through `Math.max`, so once the ranked stats layouts moved to 500 and 300 their
    420 and 290 floors could no longer change any output, and were deleted. Only a card sized
    from its own title can still outgrow its step. Re-check the floors whenever a step moves.
  - **A card's own slack absorbs its extras, so the default lands on the grid.** The stats
    card added `iconWidth` to its default and came out 17px off; the icons now ride inside the
    step, and only `minCardWidth`, which has no slack, still makes room for them.
- **The title icon is `.title-icon`, not `.icon`.** `.icon` is the stat icon, and the stats
  card sets `display: none` on it when `show_icons` is false — a title icon sharing that class
  vanishes on the card's own default. It takes `iconColor`, and so does the rule beneath it,
  so the two read against the title rather than dissolving into it.
- **The header is a band, a title, an icon and a rule under that icon, in that order.** The
  band is drawn by `Card` rather than by the title group, because it spans the card: its top
  corners take the card's own `border_radius` and its foot stays square, so it meets the body
  as an edge. `hide_title` drops the lot.
- **The band's foot and the body are one subtraction apart, never two constants.** It ends at
  `bodyOffset - TITLE_BAND.gap`, and `bodyOffset` is the single place that says where the body
  starts, so the air under the header cannot silently close up. It did close up once: the band
  first ran the full `bodyOffset` and met the first row of content with nothing between them.
- **`paddingY` is 30, and the body still starts at 55.** The title used to sit at 35 with the
  body 20 below it, which left the header top-heavy inside the band; moving the title up while
  holding `paddingY + 25` kept every card's body exactly where it was, so nothing below the
  header had to be re-measured.
- **Each card's icon is distinct, and the mapping is one table.** `CARD_ICON` in `brand.ts`,
  keyed by card. `repo` and `contributedTo` both passed `icons.contribs` — the repo glyph — and
  three cards had no icon at all, so a card was not identifiable from its header.
- **Two things that move with a width must be derived from it the same way.** The stats card
  positioned its rank ring by interpolating between two constants while the values scaled 1:1
  with the width, so widening the card by 50px moved them 50 and the ring 8, and the values
  overran the ring. Both now come off `RANK_GUTTER`.

## Card text and translations

**No user-visible string is written in English at its use site.** Every word a card draws
— a label, a title, an empty state, a fallback description, and the `<desc>` an assistive
reader gets — comes from `I18n#t`, so it is one table edit away from being translated.
This was not true until 2026-09-05: the contributed-to card was English throughout (title,
footer, "No contributions found", its whole accessibility description), the gist and repo
cards hardcoded `'No description provided'` and the `'Unspecified'` they draw for a
repository with no language, gist's accessibility line spelled out
`Language: … , Stars: … , Forks: …`, and the stats card's spelled out `Rank:`. A string
that reaches the SVG without passing through `t` is the bug this rule exists to stop.

- **A new key is written in `en` only.** Backfilling 47 locales by machine translation is
  worse than an honest fallback, so `I18n#t` reads the `en` string when the requested
  locale has no entry for the key. That fallback landed with this rule and also repaired
  the keys added before it — `statcard.contributions`, `statcard.all-time-contribs` and
  the five `repocard.*` show-stats among them — each of which threw
  `translation not found for locale` and so failed the whole card for every locale it had
  not reached. `t` still throws when the key itself is absent, and when it has no `en` —
  which `LocaleTable` requires, so only a table assembled at runtime reaches that throw.
- **A card whose text is translated takes `locale`,** in its options, in its handler's
  schema and in the CLI's option list for it. The three move together.
- **A locale table is data, declared with `defineLocales`.** It was a function of the
  values its strings interpolate until 2026-09-07 — `statCardLocales({ name, apostrophe })`
  built 45 keys × 47 locales, some 1200 strings, so a card could read 30 of them. The
  wording carries `{name}` placeholders instead and `t` substitutes them:
  `t('statcard.title', { name, apostrophe })`. `defineLocales` is a `<const Table>`
  identity function, and that is the whole point of it — it keeps each string's literal
  type, which is what lets `t` reject a call missing a value the wording declares.
- **The word order is the translation's, and so is which values it uses.** A locale may
  name fewer placeholders than `en` — most locales of `statcard.title` have no use for the
  possessive `{apostrophe}` — but never one `en` does not supply, which throws. Nothing
  checks a `{name}` the way the compiler checked a `${name}`, so `tests/locales.test.ts`
  walks every table for that and for a locale name outside `AVAILABLE_LOCALES`.
- **A wording that depends on a number is written as plural forms, not assembled.**
  `{ one: '{count} repository', other: '{count} repositories' }`; `t` is given a `count`
  and `Intl.PluralRules` picks the category by the rules of the locale the wording came
  from, with `other` answering for a category that locale has not written. This is what
  the card used to do with a `repoWord` ternary, in English's plural rule, for every
  locale.
- **A whole phrase is one key, not a `label: value` pair assembled in the card.** The
  accessibility rows are `'{repo}: {count} contributions, years: {years}'` and
  `'{desc}. Language: {language}, Stars: {stars}, Forks: {forks}'` — one wording each, so
  a translation can move the parts around. Composing them in the card was the best the
  repo could do before interpolation, and left the punctuation and the order in English's
  hands. A parenthesised year (`wakatimecard.title` plus `(last 7 days)`) is still
  composed, and is the remaining exception.
- **The error card's report line is measured, not guessed.** It sits under the message rather than
  beside the title because it no longer fits: at the title's own `600 16px` the inherited URL
  reached 561px inside a 576.5px card and `https://tinyurl.com/stats-forge-bug` reaches 587px.
  Re-measure in a canvas before moving it back. It carries `data-testid="report"`, and is omitted
  for an upstream failure or when `show_repo_link` is off — which had no test until 2026-09-07.
- **Error card text is the known exception.** `CardError` and `REJECTION_MESSAGES` are
  English, and deliberately outside `I18n`: an error is thrown before — and often
  because — the locale was parsed. Don't quietly translate one; that is its own decision.

## Testing

- Vitest. In `packages/core` the card tests assert on the rendered DOM, not on snapshots —
  the one exception is `tests/__snapshots__/renderWakatimeCard.test.ts.snap`.
- **Snapshots are byte-exact.** Template-literal contents in card renderers include
  their whitespace verbatim, and the formatter will reflow a multi-line `${cond ? a : b}`
  interpolation onto its own line, injecting a newline and indent into the SVG. Hoist
  such expressions into a `const` so the template only ever interpolates a plain
  `${identifier}`. After any card edit, diff the snapshots before assuming success.
- **Assert on DOM nodes with jest-dom matchers, never by reading the node yourself** —
  `toHaveTextContent` / `toHaveAttribute` / `toHaveClass` / `toHaveStyle` /
  `toBeInTheDocument`, not `el?.textContent).toBe(…)` or `el?.getAttribute(x)).toBe(y)`.
  They fail loudly on a missing element and print the node. In particular **never write
  `expect(queryByTestId(…)).toBeDefined()`** — `queryBy*` returns `null` when absent, and
  `null` _is_ defined, so the assertion can never fail. Use `toBeInTheDocument()` /
  `not.toBeInTheDocument()`. Converting the ~15 such no-ops in `renderStatsCard.test.ts`
  immediately exposed one asserting on `rank-percentile-text`, which is a CSS class and
  was never a test id. For array-index existence (`langNames[2]`), assert
  `toHaveLength(n)` on the `queryAllBy*` result instead — `toBeInTheDocument()` rejects
  `undefined` even under `.not`.
- Use the `@testing-library/dom` **`screen` API** (`screen.getByTestId("x")`), not
  `getByTestId(document.body, "x")` — <https://testing-library.com/docs/queries/about/#screen>.
  Cache a repeated same-id query in a local variable. Plain
  `document.querySelector` is still fine.
- Mock with the typesafe form `vi.mock(import("…"), factory)`, not
  `vi.mock("…", factory)`, and keep the static import for its types.
- jest-dom matchers are typed in `packages/core/tests/_setup.ts`, which augments vitest's
  `Matchers` interface inside `declare module "vitest"` (vitest 4 re-exports
  `Assertion`/`Matchers` from `@vitest/expect`, so augmenting `vitest` is the path that
  works — <https://vitest.dev/guide/extending-matchers>).
- Reach for `querySelector`/`querySelectorAll` over `getElementsByClassName`, and
  `document.querySelector<HTMLElement>(…)` when you need `.style`. Under the strict
  flags, `cssToObject(styleTag?.innerHTML ?? "")` and
  `stylesObject[":host"]?.[".header "]?.["fill"]?.trim()` are the working shapes.
- **Type test fixtures** (`const data: StatsData = …`). When a fixture is a `Record<…>`
  that you also access by dot, annotating it would trip
  `noPropertyAccessFromIndexSignature` — use `… satisfies TopLangData` instead, which
  validates against the type while keeping the concrete keys.
- **The vitest rules oxlint disagrees with are off in one place, with reasons.** A card
  test asserts on every node the card drew, so `max-expects` is off; the `?.` and `??`
  that `noUncheckedIndexedAccess` forces are not "conditionals in tests", so
  `no-conditional-in-test` is off; a file-level `beforeAll` applies to every suite in the
  file, so `require-top-level-describe` is off. `expect-expect` knows about the XSS
  suite's `expectNoScript` helper through `assertFunctionNames`.
