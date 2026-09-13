# The documentation site

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

`apps/docs` is Astro + Starlight, served under `base: '/github-stats-forge'` because GitHub Pages
puts it below the repository name. It is **not published to npm**, so it carries no changeset and
no `lint:publish`.

- **The same site is built twice, and `SITE_BASE` plus `SITE_SERVER` are the whole difference.**
  Pages gets the repository name and no server; the image gets `/` and `SITE_SERVER=true`. Both
  are read in `src/constants.ts`, **in Node only** — the one script the site ships reads Astro's
  own `import.meta.env.BASE_URL`, and is told about the server through a `data-source` attribute
  `anvil.astro` writes onto the page.
- **Every image the site serves lives in `apps/docs/public/`, and one file is both the favicon and
  the header logo.** `public/` serves it verbatim at a stable URL, which a favicon needs, and
  Astro's pipeline emits a hashed copy for `logo.src` and reads the social preview's dimensions
  off the import — so importing out of `public/` is deliberate here rather than the mistake it
  usually is. What stays in `.github/assets/` is the **repository's** artwork, `appIcon.svg`
  because the README shows it; the site no longer reaches across for anything.
- **A self-hosted instance says so, in four places, and its icon is a committed twin.**
  The two deployments differ in the way that matters most — one draws cards from a token and the
  other from nothing — so a visitor has to be able to tell which one they landed on.
  `public/favicon-self-hosted.svg` is `favicon.svg` with the anvil's bars in amber, and
  `astro.config.ts` picks between the two on `SERVED_BY_INSTANCE`.
  - **Committed, not generated.** A build-time generator plus a gitignore entry was written and
    removed on 2026-09-10: two icons that must agree is the same trade `public/favicon.svg`
    already makes against `.github/assets/appIcon.svg`, and it does not need machinery. Change one
    and change the other.
  - The others are a chip beside the title (`SiteTitle.astro`) whose detail is given up on hover,
    an amber site title beside it, a `(self-hosted)` suffix on the tab, and a banner on the
    landing page. **The chip's tooltip is CSS, not `wa-tooltip`** — that is a Web Awesome element
    and the anvil is the only page here that loads any; the detail is screen-reader-only until
    hovered or focused, so it is in the accessibility tree either way.
  - **The chip's tooltip needs Starlight's clip lifted, or it renders and is invisible.**
    `.title-wrapper` carries `overflow: clip` so a long site title cannot push the header open,
    and it is 50px tall — the tooltip hangs past that. `:global(.title-wrapper:has(.self-hosted))`
    sets `overflow: visible`, so the lift reaches only a build whose title is known to fit.
    Checked at 320, 420 and 1280px: the tooltip clears the header and nothing scrolls sideways.
  - **Two amber shades, not one.** The header follows the theme, so `#b45309` is what clears AA
    on a light one and `#f59e0b` on a dark one. The title is Starlight's own element, reached
    through `:global(.title-wrapper:has(.self-hosted) .site-title)` — keyed off the chip so the
    rule is inert on a Pages build.
  - **The tab is amended in the route data, not in the config.** Starlight builds `<title>` from
    the configured site title, which the chip beside that title would then say twice, so
    `Head.astro` rewrites the `title` entry of `Astro.locals.starlightRoute.head` instead.
  - **Starlight has no site-wide banner setting** — it reads one off a page's frontmatter, and a
    markdown page cannot know what is serving it. `Banner.astro` writes it into the route data on
    the landing page alone, so it wears Starlight's own styling and appears once.
- **Every documentation page is markdown, the landing page included.** `.astro` exists for the
  config, the plugins, the four Starlight overrides and the anvil, nothing else. A documentation page
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
  business on the landing page or the anvil. Four things follow from that split, each already paid for once:
  - **A link from the root README has to spell `/docs/` itself, and nothing checks it.**
    `starlight-links-validator` sees only the site's own pages, so four of the README's five
    documentation links pointed a level too high and 404ed from the day the tree moved under
    `/docs/` until 2026-09-10. `/anvil/` is the exception that really does sit at the root.
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
- **`<!-- demo: cli -->` on `usage/cli.md` is a recorded screen capture, not a re-enactment.**
  `public/cli-demo.mp4` is a real session — the stats card open above the terminal in an editor,
  the menu picking a theme, the card redrawn when it is generated — and
  `src/plugins/remark-cli-demo.ts` places it. A **CSS replay of the same session was built first
  and thrown away on 2026-09-12**: seven hand-transcribed terminal frames stepped by keyframes,
  faithful to the real output and still a simulation of a thing we can simply record. Don't
  rebuild it.
  - **It is a plugin rather than raw HTML in the markdown**, because the src has to carry `BASE`;
    a deployment detail stays out of the prose, the same reason `remark-resolve-links` exists.
  - **`.mp4`, `.jpg` and `.jpeg` had to be added to both static tables** —
    `apps/server/src/static.ts` and `e2e/serve.ts`. They answer an unknown extension
    `application/octet-stream`, and `x-content-type-options: nosniff` then makes the browser
    **refuse** the file rather than merely mislabel it, so the video and its poster would both
    have been dead in the image while working on Pages. Adding the video and forgetting its
    poster is exactly how half of this gets missed — check every extension a change introduces
    against that table, and against its copy.
  - **It is not autoplayed.** It runs 44 seconds, and an `autoplay` attribute cannot be withdrawn
    for `prefers-reduced-motion` without shipping JavaScript to a page that has none — so it
    carries `controls`, a `poster` and `preload="metadata"` instead.
  - **The `width` and `height` are written down** rather than read off the file: nothing here
    decodes an mp4, and without them the box resizes as the metadata lands.
  - **The editor's panel tab bar was painted out of the recording, not hidden with CSS.** A strip
    of `#1b1b1b` covers rows 774 to 868 — the separator, the tab row and the active tab's bottom
    edge — because an overlay on the page would peel away the moment anyone went fullscreen, which
    is how a 2692px capture actually gets watched. Done with AVFoundation from a throwaway Swift
    tool, `swiftc` being on every mac with the developer tools and ffmpeg not being installed
    here; the re-encode at 700 kbps also took the file from 2.9 MB to 1.7 MB. **Re-cut the poster
    whenever the video changes** — it is a frame of it, and a stale one shows the furniture that
    was just removed.
  - **Measure such a band, never eyeball it.** Chromium decodes the mp4 that Playwright's own
    bundled ffmpeg will not, so a throwaway script drew frames to a canvas and scanned rows: the
    bar sat at 808–839 in every frame of the 44 seconds, and a first pass that stopped at 842 left
    a lit sliver of the active tab behind.
- **Each fetcher has its own page, and `<!-- api: fetchStats -->` becomes its reference at build
  time.** `remark-fetcher-reference.ts` expands the marker; `fetcher-reference.ts` reads the
  summary, the `@returns`, the return type and every option — name, type, whether it is optional,
  and whatever `/** */` sits on its declaration — through the TypeScript checker. Prose around the
  marker is hand-written. **Nothing is generated onto disk**, so there is no `--check` and no way
  to be stale; the build is the check. A fetcher exported from core with **no page fails the
  build**, naming the file to write — that is how a new one gets documented rather than dropped.
  - It was a committed generator with a `--check` for one commit, and became a plugin because
    opening core's project costs 110ms and reading every fetcher costs 4ms. At that price,
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
  - **Every `uses:` in an example is pinned by SHA with the release tag as its comment** — ours
    on `usage/cli.md`, and the two `actions/*` steps in `usage/in-your-readme.md` — as the action's
    own README is, and as the hardening this documentation recommends. Renovate moves them: a `customManagers` entry in
    `.github/renovate.json5` reads that shape out of `src/content/docs/**/*.md` and opens a PR,
    with a `postUpgradeTasks` command writing the server changeset the page change needs. Write
    any new example as `uses: <owner>/<repo>@<sha> # vX.Y.Z` under `src/content/docs`, which is
    the shape and the tree the manager's regex covers.
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
  - **On a phone they take a row of their own; they must not be hidden there.** They were, under
    50rem, and the sidebar does not stand in for them: Starlight renders the menu button only for a
    page that has a sidebar, and both splash pages have none — so `/anvil/` was reachable from
    nowhere and led nowhere but home. `e2e/anvil.spec.ts` asserts it at 390px.
  - **Raising `--sl-nav-height` is what makes room for that row, and two things ride on it.** The
    logo's height is `calc(var(--sl-nav-height) - 2 * var(--sl-nav-pad-y))`, so it grows with the
    header unless it is pinned back to the 2rem the one-row header gave it; the menu and search
    buttons then centre themselves across both rows, 13px below the title, and are held on the
    first. Everything else follows the variable on its own — the content's top padding, and the
    mobile menu panel's own top.
- **`PageTitle` is overridden to put a section trail above a card page's title.** Starlight has no
  breadcrumb component, and this one is four overrides' worth of nothing anywhere else: it renders
  the labels of the groups a page sits under, taken from `Astro.locals.starlightRoute.sidebar`, and
  renders nothing at all where that is one group deep. It is the seam every page without a hero
  goes through — the anvil included, which is not in the sidebar and so gets no trail.
- **`SocialIcons` is overridden only to open the links in a new tab.** Both leave the site, and
  Starlight's own renders them with no `target`. The override is its markup and its styles copied,
  plus `target="_blank"`, `rel="me noopener"` and "(opens in a new tab)" in the screen-reader label
  — so re-copy it from `@astrojs/starlight/dist/components/SocialIcons.astro` if Starlight changes
  that component.
- **`Head` is overridden for the one Open Graph tag Starlight omits.** It emits `og:title`,
  `og:type`, `og:url`, `og:description`, `og:site_name` and `twitter:card: summary_large_image`
  itself, but never an `og:image`, so a shared link unfurled as text with a card-shaped hole.
  `src/components/Head.astro` renders Starlight's own and appends the image, its dimensions and its
  alt text; `<StarlightPage>` uses the same component, so the anvil is covered with it.
  - **On the image build, canonical, `og:url` and `og:image` are rewritten to Pages, base
    included.** Starlight resolves the page's own path against `site`, and on the image that path
    has no base — so every tag pointed at `https://stats-forge.github.io/docs/…`, a 404. Pages
    stays canonical, so `Head.astro` puts `PAGES_BASE` back in the route data; `PAGES_SITE` and
    `PAGES_BASE` live in `constants.ts`.
  - **The image is `public/social-preview.png`, imported rather than referenced by URL.** A plain
    ESM import goes through Astro's asset pipeline, which reads a PNG's dimensions without handing
    it to sharp — so nothing writes 1280×640 down.
  - **`og:image` has to be absolute**, so the emitted `src` — which already carries the base — is
    resolved against `Astro.site`. Its 1280×640 is read off the import rather than written down,
    and a scraper uses it to reserve the space before the image arrives.
  - **The SVG beside it is not usable here**: scrapers take PNG and JPEG, and none render SVG.
- **A theme sample is one image, a card preview is two.** The plugin renders
  `/themes/<name>.svg` once — it already names its theme — and pairs `/cards/<name>.svg`.
  `SAMPLE_THEMES` in `src/constants.ts` is read by both generators, so the page cannot draw a
  theme nobody rendered.
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
  - **A workflow that commits sets `LEFTHOOK: 0`, because the pre-commit hook lints too.** The
    language-colors run of 2026-09-09 failed on exactly these two errors the first time upstream
    actually changed. Written up in `.github/CONTRIBUTING.md`, "Workflows That Commit".
- **The site typechecks against core's source, not its build, and so has no
  `tsconfig.typecheck.json`.** Clearing `customConditions` is how a _published_ package proves a
  consumer can resolve it; `apps/docs` is not published and not that consumer, and `packages/cli`
  plus `lint:publish` already make that case. Keeping the `@stats/source` condition means the
  editor and CI agree. **Typechecking needs nothing built; the site's `astro build` does** — see
  `docs:build` below.
- **`.astro/` is `astro sync` output**: gitignored, and ignored by oxlint and oxfmt. Do not lint
  or format it, and do not commit it.
