# The documentation site

> Scoped to this tree; the repo-wide rules are in the root `AGENTS.md`.

Astro + Starlight under `base: '/github-stats-forge'`, as Pages serves it below the repository name.
**Not published to npm**, so no changeset or `lint:publish` of its own; a visitor-visible change
carries a server changeset.

## Generated and committed, never hand-edited

- **A card example is drawn by the CLI, never by hand or at build time** ([#50]).
  `apps/docs/cards/*.json` holds theme-less saved cards; `pnpm docs:cards` draws each per site theme
  into `public/cards/<name>-{light,dark}.svg`, against `scripts/fixtures.ts` loaded through
  `node --import scripts/fixture-fetch.ts` ([#225]). `docs:cards:check` fails on any difference.
- **`customization/themes.md` is generated** by `scripts/generate-themes-page.ts` through oxfmt's
  API; `check-themes-page` fails on drift.
- **Every example `uses:` is `<owner>/<repo>@<sha> # vX.Y.Z`**, the shape Renovate's custom manager
  reads ([#114]).
- **`public/favicon-self-hosted.svg` is `favicon.svg` with amber bars**: change both.

## Building and checking

- **One site, built twice; `SITE_BASE` and `SITE_SERVER` are the whole difference** ([#79]). Pages
  gets the repository name and no server, the image `/` and `SITE_SERVER=true`. `src/constants.ts`
  reads them **in Node only**; the one shipped script reads `import.meta.env.BASE_URL` and a
  `data-source` attribute.
- **`astro sync` runs before anything type-aware** ([#50]); `check-all` and CI start with
  `docs:sync`. Green locally, red in CI? Delete `apps/docs/.astro` and `packages/*/build`, and rerun.
- **A workflow that commits sets `LEFTHOOK: 0`**: see "Workflows That Commit" in
  `.github/CONTRIBUTING.md`.
- **It typechecks against core's source**, so it has no `tsconfig.typecheck.json`, but its
  `astro build` needs the packages built, as `docs:build` does.
- **Every dependency is pinned exactly**: nothing resolves a range for a private package.
- **`.astro/` is gitignored sync output**, never linted, formatted or committed.
- **`astro dev` serving `504 Outdated Optimize Dep`? Clear `node_modules/.vite` and check in a
  browser.** It was an Astro bug fixed in 7.3.2
  ([withastro/astro#17929](https://github.com/withastro/astro/issues/17929)) that a warm cache hides
  and `curl` never triggers.

## Pages and links

- **Every page is markdown except the anvil, an application** ([#58]): `src/pages/anvil.astro`
  renders through `<StarlightPage>` to carry a `<script>`. **Nothing validates its links.**
- **Pages link relatively, and `remark-resolve-links.ts` resolves them before the validator collects
  them** ([#50]); that is what makes validation real. Never write the base into a link, nor a
  `./page.md`, which Astro does not rewrite. `routeOf` strips `index` at any depth.
- **`/` is a landing page and the docs live under `/docs/`** ([#50]); the two pages outside carry
  `template: splash`.
  - **A link from the root README must spell `/docs/`, and nothing checks it** ([#85]).
  - **The landing page has no hero image** (Astro would need sharp). Its call to action is markdown
    links in `<div class="hero-actions">`, since frontmatter never reaches `remark-resolve-links`.
- **One image in the markdown, two in the page** ([#50]): `rehype-card-previews.ts` turns
  `![alt](/cards/<name>.svg)` into the light and dark pair, adding the base and the SVG's size and
  hiding the dark copy with `aria-hidden`. It **throws when the pair is missing**. A theme sample is
  one image; `SAMPLE_THEMES` in `src/constants.ts` feeds both generators.
- **Each fetcher has its own page, and `<!-- api: fetchStats -->` becomes its reference at build
  time** ([#50]), read through the TypeScript checker on `typescript/unstable/sync` (TypeDoc's peer
  range excludes TypeScript 7). **A fetcher with no page fails the build.** `astro dev` needs a
  restart to see a doc-comment edit, live refresh having cost more than restarts. Weigh the cost
  before extending this to the cards: a hand-written table with real prose beats a generated one
  full of dashes.
- **`<!-- demo: cli -->` is a recorded screen capture** ([#98]), placed by `remark-cli-demo.ts`; don't
  bring back the CSS replay.
  - **A new file extension goes in both static tables**, `apps/server/src/static.ts` and
    `e2e/serve.ts`, or `nosniff` refuses it as `application/octet-stream`.
  - **It does not autoplay**, which cannot honour `prefers-reduced-motion` without JavaScript: it has
    `controls`, a `poster`, `preload="metadata"`, and a written `width` and `height`.
  - **Edit the recording, never CSS over it, and re-cut the poster with every change**, measuring a
    band to paint out from decoded frames.
- **The GitHub Action is the recommended way to use the cards, and the site links to it rather than
  documenting it** ([#50]): nothing here could check a copy of its inputs.
- **A diagram is a fenced `text` block, not mermaid**; copy the one on `light-and-dark.md`.

## Look and chrome

- **Every image lives in `apps/docs/public/`**; `favicon.svg` is the favicon and the logo. Importing
  from `public/` gives a stable URL and a hashed copy.
- **A self-hosted instance says so wherever a visitor looks** ([#79]): the amber icon (chosen in
  `astro.config.ts` on `SERVED_BY_INSTANCE`), a chip and an amber title, a `(self-hosted)` tab suffix,
  and a banner on the landing page.
  - **The chip's tooltip is CSS** (Web Awesome loads only on the anvil), lifting `.title-wrapper`'s
    `overflow: clip` through `:global(.title-wrapper:has(.self-hosted))`.
  - **Amber is `#b45309` on a light header and `#f59e0b` on a dark one**, each clearing AA.
  - **`Head.astro` amends the tab title and `Banner.astro` writes the banner in the route data**,
    since Starlight reads a banner only from frontmatter.
- **`SiteTitle.astro` puts a "Docs" and "Anvil" nav beside the title** ([#50]); the anvil is not in
  the sidebar.
  - **On a phone the nav takes its own row and stays visible** ([#105]): a splash page has no menu
    button, and `e2e/anvil.spec.ts` asserts it. `--sl-nav-height` makes the room; pin the logo, and
    keep the menu and search on the first row.
- **`PageTitle` puts a section trail, read from the sidebar, above a card page's title** ([#105]).
- **`SocialIcons` is Starlight's plus `target="_blank"`**; re-copy it when Starlight changes it.
- **`Head` adds the `og:image` Starlight omits** ([#63]): absolute, and a PNG, since scrapers take
  PNG or JPEG and never SVG, sized from the imported `public/social-preview.png`. The image build
  rewrites canonical, `og:url` and `og:image` to Pages from `PAGES_SITE` and `PAGES_BASE`.

[#50]: https://github.com/stats-forge/github-stats-forge/pull/50
[#58]: https://github.com/stats-forge/github-stats-forge/pull/58
[#63]: https://github.com/stats-forge/github-stats-forge/pull/63
[#79]: https://github.com/stats-forge/github-stats-forge/pull/79
[#85]: https://github.com/stats-forge/github-stats-forge/pull/85
[#98]: https://github.com/stats-forge/github-stats-forge/pull/98
[#105]: https://github.com/stats-forge/github-stats-forge/pull/105
[#114]: https://github.com/stats-forge/github-stats-forge/pull/114
[#225]: https://github.com/stats-forge/github-stats-forge/pull/225
