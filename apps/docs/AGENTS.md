# The documentation site

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

`apps/docs` is Astro + Starlight, served under `base: '/github-stats-forge'` because GitHub Pages
puts it below the repository name. It is **not published to npm**, so it carries no changeset of
its own and no `lint:publish`; a change a visitor would notice carries a server changeset instead.

## Generated and committed — never hand-edit

- **A card example is rendered by the CLI, never hand-drawn and never fetched at build time** ([#50]).
  `apps/docs/cards/*.json` holds saved cards without a theme; `pnpm docs:cards` renders each once per
  site theme into `public/cards/<name>-{light,dark}.svg`, committed so the build needs no token.
  - **The CLI draws them from the fictional account** in `scripts/fixtures.ts`, loaded through
    `node --import scripts/fixture-fetch.ts`, which points the global `fetch` at it ([#225]).
  - **`check-cards` redraws every preview and fails on any difference** — `pnpm docs:cards:check`,
    in CI and in `check-all` ([#225]).
- **`customization/themes.md` is generated** by `scripts/generate-themes-page.ts`, through oxfmt's
  API, and `check-themes-page` fails on drift.
- **Every `uses:` in an example is pinned by SHA with its release tag as a comment** — written as
  `uses: <owner>/<repo>@<sha> # vX.Y.Z` under `src/content/docs`, the shape Renovate's custom
  manager reads ([#114]).
- **A self-hosted instance's icon is a committed twin**: `public/favicon-self-hosted.svg` is
  `favicon.svg` with amber bars. Change one, change the other.

## Building and checking

- **The same site is built twice, and `SITE_BASE` plus `SITE_SERVER` are the whole difference**
  ([#79]). Pages gets the repository name and no server; the image gets `/` and `SITE_SERVER=true`.
  Both are read in `src/constants.ts`, **in Node only** — the one script the site ships reads
  `import.meta.env.BASE_URL`, and learns of the server from a `data-source` attribute.
- **`astro sync` has to run before anything type-aware** ([#50]): `astro:content` has no types until
  then. `check-all` and CI start with `docs:sync`. When something passes locally and fails in CI,
  delete `apps/docs/.astro` and `packages/*/build` and run it again.
  - **A workflow that commits sets `LEFTHOOK: 0`**, because the pre-commit hook lints too — see
    "Workflows That Commit" in `.github/CONTRIBUTING.md`.
- **The site typechecks against core's source, so it has no `tsconfig.typecheck.json`.** Its
  `astro build` does need the packages built, which `docs:build` does.
- **`apps/docs` pins every dependency exactly**: it is private, so nothing resolves a range for it.
- **`.astro/` is `astro sync` output**: gitignored, never linted, formatted or committed.
- **If `astro dev` serves `504 Outdated Optimize Dep` again, clear `node_modules/.vite` and measure
  through a browser.** It was an Astro bug fixed in 7.3.2
  ([withastro/astro#17929](https://github.com/withastro/astro/issues/17929)); a warm cache hides it,
  and `curl` never triggers it.

## Pages and links

- **Every documentation page is markdown; the anvil is the one exception, because it is an
  application** ([#58]). `src/pages/anvil.astro` renders through `<StarlightPage>` to carry a
  `<script>`. **Nothing validates its links** — check them by hand.
- **Pages link to each other relatively, and `remark-resolve-links.ts` resolves them** ([#50]). The
  link validator cannot check a relative link, so this plugin is what makes validation real. It
  runs as a **remark** plugin so it rewrites links before the validator collects them. Never write
  the base into a link, and don't use `./page.md` links, which Astro does not rewrite.
  - **`routeOf` strips `index` at any depth**: `docs/index.md` is served at `/docs/`.
- **`/` is a landing page and the documentation lives under `/docs/`** ([#50]). The two pages outside
  it carry `template: splash`, which drops the sidebar and table of contents.
  - **A link from the root README must spell `/docs/` itself, and nothing checks it** ([#85]).
  - **The landing page has no hero image** — Astro would hand it to sharp, which is not installed.
  - **Its call to action is markdown links in `<div class="hero-actions">`, not `hero.actions`**:
    frontmatter never reaches `remark-resolve-links`.
- **One image in the markdown, two in the page** ([#50]). `rehype-card-previews.ts` turns
  `![alt](/cards/<name>.svg)` into the light and dark pair, adds the base, reads the size off the
  SVG, and marks the dark copy `aria-hidden`. It **throws when the pair is missing**.
  - **A theme sample is one image**, already naming its theme. `SAMPLE_THEMES` in `src/constants.ts`
    is read by both generators.
- **Each fetcher has its own page, and `<!-- api: fetchStats -->` becomes its reference at build
  time** ([#50]). The plugin reads the summary, `@returns` and options through the TypeScript
  checker; nothing is written to disk, so it cannot go stale. **A fetcher with no page fails the
  build.**
  - **`astro dev` does not pick up an edit to core's doc comments — restart it.** Live refresh was
    built and deleted as more machinery than a restart costs; rebuild it only if that trade changes.
  - **Weigh the cost before extending this to the cards**: a hand-written table with real prose
    beats a generated one full of dashes.
  - It rides `typescript/unstable/sync`. TypeDoc's peer range excludes TypeScript 7, which
    `strictPeerDependencies` turns into a failed install.
- **`<!-- demo: cli -->` on `usage/cli.md` is a recorded screen capture** ([#98]). Don't rebuild the
  CSS replay that preceded it.
  - **It is placed by `remark-cli-demo.ts`**, so the src carries `BASE` without the prose knowing it.
  - **Every new file extension must be added to both static tables** — `apps/server/src/static.ts`
    and `e2e/serve.ts`. An unknown one is `application/octet-stream`, which `nosniff` makes the
    browser refuse.
  - **It is not autoplayed**: autoplay cannot honour `prefers-reduced-motion` without JavaScript.
    It carries `controls`, a `poster` and `preload="metadata"`, and its `width` and `height` are
    written down.
  - **Edit the recording itself, not with CSS over it**, and **re-cut the poster whenever the video
    changes**. Measure a band to paint out from decoded frames; don't eyeball it.
- **The GitHub Action is the recommended way to use the cards, and the site links to it rather than
  documenting it** ([#50]): nothing here could check a copy of its inputs against its `action.yml`.
- **A diagram is a fenced `text` block, not mermaid** — a client bundle or Chromium is not
  proportionate to a diagram. Copy the one on `light-and-dark.md`.

## Look and chrome

- **Every image the site serves lives in `apps/docs/public/`**, and `favicon.svg` is both the favicon
  and the header logo. Importing from `public/` is deliberate here: it gets a stable URL and a
  hashed copy.
- **A self-hosted instance says so wherever a visitor looks** ([#79]): the amber icon (chosen in
  `astro.config.ts` on `SERVED_BY_INSTANCE`), a chip beside the title, an amber title, a
  `(self-hosted)` tab suffix, and a banner on the landing page.
  - **The chip's tooltip is CSS, not `wa-tooltip`** — Web Awesome loads only on the anvil.
  - **Its tooltip needs `.title-wrapper`'s `overflow: clip` lifted**, through
    `:global(.title-wrapper:has(.self-hosted))`, so a Pages build is untouched.
  - **Two amber shades**: `#b45309` clears AA on a light header and `#f59e0b` on a dark one.
  - **`Head.astro` amends the tab title in the route data**, not the config, so the chip does not say
    it twice. **`Banner.astro` writes the banner into the route data**, because Starlight reads one
    only from frontmatter.
- **The header carries a top nav, because Starlight has none** ([#50]). `SiteTitle.astro` puts "Docs"
  and "Anvil" beside the title; the anvil is not in the sidebar.
  - **On a phone they take a row of their own and must not be hidden** ([#105]): a splash page has no
    menu button, so the nav is the only way to `/anvil/`. `e2e/anvil.spec.ts` asserts it.
  - **Raising `--sl-nav-height` makes room for that row**; pin the logo back to its height, and hold
    the menu and search buttons on the first row.
- **`PageTitle` puts a section trail above a card page's title** ([#105]), read from the sidebar.
- **`SocialIcons` is Starlight's own plus `target="_blank"`** — re-copy it if Starlight changes the
  component.
- **`Head` adds the `og:image` Starlight omits** ([#63]), from an imported `public/social-preview.png`.
  - **On the image build, canonical, `og:url` and `og:image` are rewritten to Pages, base included**,
    from `PAGES_SITE` and `PAGES_BASE`; Pages stays canonical.
  - **`og:image` is absolute**, and its size is read off the import. Scrapers take PNG or JPEG,
    never SVG.

[#50]: https://github.com/stats-forge/github-stats-forge/pull/50
[#58]: https://github.com/stats-forge/github-stats-forge/pull/58
[#63]: https://github.com/stats-forge/github-stats-forge/pull/63
[#79]: https://github.com/stats-forge/github-stats-forge/pull/79
[#85]: https://github.com/stats-forge/github-stats-forge/pull/85
[#98]: https://github.com/stats-forge/github-stats-forge/pull/98
[#105]: https://github.com/stats-forge/github-stats-forge/pull/105
[#114]: https://github.com/stats-forge/github-stats-forge/pull/114
[#225]: https://github.com/stats-forge/github-stats-forge/pull/225
