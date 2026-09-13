# AGENTS.md

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
which writes the CLI's config file) and `SERVER_DOCKER.md` — whose phases 1 to 4 landed on
2026-09-09 as `apps/server`, 6 and 7 on 2026-09-10 and the "Run it yourself" page as
`usage/self-hosting.md`, leaving `/instance` and live previews still to do.

## What this is

`github-stats-forge` — a pnpm monorepo holding the library that renders
GitHub stats as SVG cards, the CLI that writes one to a file, the server that serves them over
HTTP, and the site that documents all three. The Express backend that used to live here is gone
and nothing was ported from it; `apps/server` is designed from what core exposes today.

| Path            | What it is                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| `packages/core` | The library: fetchers, card renderers, themes, api handlers                                                   |
| `packages/cli`  | `github-stats-forge`: prompts through a card's options, writes the SVG, saves and reloads a card's config     |
| `apps/server`   | The HTTP server over core's api handlers, and the container image it ships in; **published to GHCR, not npm** |
| `apps/docs`     | The documentation site — Astro + Starlight, every page markdown; **not published**                            |
| `scripts/`      | Repo-level tooling — `check-all.ts`, via `tsconfig.scripts.json`                                              |

**The workspace is `packages/*` and `apps/*`, and what a thing publishes to is what decides its
rules — not which folder it sits in.** A package under `packages/` goes to npm, so it carries a
changeset and a `lint:publish`. `apps/docs` publishes nothing and carries neither. `apps/server`
publishes an image, so it **does carry a changeset** and no `lint:publish`: the release that
publishes to npm publishes the image too, and the version it is tagged with is the one changesets
set. `build:packages` and `lint:publish` stay filtered to `./packages/*`; the root `typecheck` and
the root `typecheck` covers the packages, both apps and `scripts/`, and the root `vitest` projects
the packages and `apps/server` — `scripts/` has no tests.

- **`privatePackages: { version: true, tag: false }` in `.changeset/config.json` is what makes
  that work**, together with a `version` field on `apps/server/package.json`. `apps/docs` has no
  `version` field, so changesets leaves it alone — that is the difference between the two apps,
  and it is deliberate rather than an oversight.
- **`updateInternalDependencies: patch` means a core release bumps the server too**, so a card
  change reaches the image without a changeset naming the server. Confirm with
  `pnpm exec changeset status`.

**A rule about one directory lives in that directory.** This file holds what is repo-wide;
these hold the rest, and load when work touches their tree:

| File                                | What it covers                                                       |
| ----------------------------------- | -------------------------------------------------------------------- |
| `packages/core/AGENTS.md`           | The api layer as the trust boundary, and the generated GraphQL types |
| `packages/core/src/cards/AGENTS.md` | Card branding, card text and translations                            |
| `packages/cli/AGENTS.md`            | The CLI                                                              |
| `apps/server/AGENTS.md`             | The server and the container image it ships in                       |
| `apps/docs/AGENTS.md`               | The documentation site                                               |
| `apps/docs/src/anvil/AGENTS.md`     | The anvil, its controls and its browser tests                        |

Split out on 2026-09-13, when one file had reached 1,700 lines and some 34k tokens on every
session — seven eighths of it about a single directory, and idle in every session that never
opened one. Put a new rule where its subject lives. What stays here is what crosses
directories, and anything that has to be known _before_ choosing which one to work in.

`packages/core/src` is laid out as `fetchers/` (network) → `cards/` (SVG render) →
`api/` (query-string handlers), with `common/` for shared helpers, `themes/` for the
theme table and `graphql/` for query text and its generated types.

**A card is a folder under `cards/`**, holding its renderer as `index.ts` and its
translations as `locales.ts`; only `cards/options.ts` sits loose beside them. The tables
were one `src/translations.ts` until 2026-09-07 — a file no card owned, which every card
had to be read alongside.

**Every source file is TypeScript**, `packages/cli/bin.js` excepted — see `packages/cli/AGENTS.md`
for why that one cannot be. The generators under `packages/core/scripts/` were
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
pnpm lint:publish         # attw + publint in each package — guards what gets published
pnpm format               # oxfmt --write . (`format:check` in CI)
pnpm build:packages       # build packages/*
pnpm cli --help           # build, then run the CLI (add any of its flags)
pnpm server:standalone    # the HTTP server against the root .env, watching for edits; cards only
pnpm server:hosted        # build the site as the image does, then the server with the site attached
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
`scripts/check-all.ts` — twelve checks ordered so the fastest failure surfaces first, each
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

## Working agreements

- **Don't commit or open PRs unless asked** — the repo owner usually does that. Leave
  changes in the working tree, and when a branch is wanted, say which commits are on it.
- **A change to `packages/*` carries a changeset, written without being asked.**
  Add it to `.changeset/` as part of the same change, not as a follow-up:
  the published `CHANGELOG.md` is generated from these files,
  so a package change shipped without one is invisible to consumers.
  - **The summary's first line is a conventional commit, and it carries no scope** —
    `refactor!: …`, `feat: …`, `ci: …` — because it lands verbatim in the changelog
    (see the 0.0.2 entry in `packages/core/CHANGELOG.md`),
    where it already sits under the package's own name and version.
    The scope belongs in the commit message, which is read with the whole repository
    in front of it; the frontmatter is what names the package here.
    Blank line, then the prose.
  - **The packages are pre-1.0, so a breaking change is `minor`**, not `major`:
    changesets would read `major` as 0.0.2 → 1.0.0.
  - **A dependent package needs no entry of its own.**
    `updateInternalDependencies: patch` bumps it, so removing core's root entry
    patched the CLI without the changeset naming it.
    Confirm with `pnpm exec changeset status` before committing.
  - **A change to `apps/docs` a visitor would notice carries a changeset on the _server_.**
    The image ships the documentation site, so an anvil or a page change is a change to what
    `apps/server` publishes; `heavy-moons-repeat.md` in the 0.1.0 release is already that shape,
    a server `minor` whose whole content is about the site. It is also the only way such a change
    is releasable at all — `apps/docs` has no `version` field, so a docs-only tree gives
    `changeset status` nothing to bump.
  - A pure tooling change that leaves the published output alone can go without one —
    that is the owner's call, so ask rather than assume.
- **Keep this file current.** When a rule here stops matching the repo, fix it in the
  same change that broke it; no need to ask first. The rules earn their keep only while
  they are true, and a stale rule is worse than no rule.
- **Every untracked working file lives in `.claude/scratch/`** — review replies, design
  plans and pending-work lists, all in one ignored folder instead of scattered across the
  repo root. The rule files are the exception: `AGENTS.md` at the root and in the six
  directories listed above, each with a one-line `CLAUDE.md` beside it that imports it —
  Claude Code discovers `CLAUDE.md` and not `AGENTS.md`, verified on 2.1.263, so the stub
  is what keeps the agnostic name working rather than silently dropping every rule.
- **Don't call the person reading the docs "the reader".** It is uncommon phrasing for
  documentation, and it was doing two different jobs: where the subject is really the user agent it
  is **the browser** (`the browser's colour scheme`, `wider than the browser window`), and where it
  is a person it is **you**, **anyone** or **a visitor** (`a visitor to your profile fetches the
SVG`). Fourteen uses across five pages were rewritten on 2026-09-07. **`screen reader` stays** —
  it is the standard accessibility term, and `assistive reader` was normalised to it.
- **A token never appears in a command the documentation tells someone to run.**
  `-e PAT_1=github_pat_...` puts it in the shell history and in `docker inspect`,
  and four pages carried it until 2026-09-13. The examples show `--env-file cards.env`,
  a pass-through `-e PAT_1`, or a secret manager instead; the self-hosting page's
  "Where the token lives" is the long form, and anything new links there rather than
  restating it. The same goes for the CLI's `--pat`, hence `--pat "$token"`.
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

**A `@file` block is the first thing in its file, before the imports** — after the shebang, where
there is one. That is where JSDoc places a file-level tag, and it was true of one file in 41 until
2026-09-10, when the other 40 moved. Nothing enforces it: oxlint's jsdoc plugin has no rule for
the tag's position, and a script that checked it was written and removed the same day as more
machinery than the rule is worth. Put the block first when you write one, and move it when you
find one below the imports.

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
- **`overrides` is where a deprecated transitive dependency gets replaced.**
  `node-fetch` is aliased to `node-fetch-native`, which is the same API with no
  dependencies: `@lit-labs/ssr` — a `@awesome.me/webawesome` dependency, so reached
  through the anvil — wants it for one `fetch` on its DOM shim's window, and node-fetch's
  own blob and formdata shims brought the deprecated `node-domexception` with them.
  Every published version of that package is deprecated, so a version bump is not the fix.
  **Neither package's code runs here**, the site importing webawesome's components and never
  the `@lit-labs/ssr` behind them, so this is a lockfile change and nothing more:
  six packages left it on 2026-09-10 for the one that replaced them.
- **Nothing polices an override, and the script that tried was deleted.**
  `scripts/assert-deduped.ts` failed on a package locked at two versions and on an entry
  whose override was gone, for a `SINGLE_VERSION` list that held one package —
  `lightningcss`, whose override had already left `pnpm-workspace.yaml` without the list
  noticing. It was a CI job and a `check-all` step to guard one line, and went on
  2026-09-10. Check an override by hand with `pnpm why <pkg>` when you touch one.
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
  the card options that do read it. It is on all eight today, because the gist and
  contributed-to cards had their last English literals put through a locale table on 2026-09-05 —
  the rule is that the option follows the reading, not that any given card has one.
- **Colocate card options.** Each card declares `interface XCardOptions extends
CommonCardOptions {…}` (an interface, not `type &`) in its own `index.ts`, **not exported** —
  knip flags it, and only that card uses it. All eight cards do this, so
  `cards/options.ts` holds only the shared base: `CommonCardOptions`, plus the
  `CardOptions<T>` helper below. The `ThemeName` union lives in `themes/index.ts`.
- **`CommonCardOptions` extends `ColorParams`.** Every card forwards its whole options
  object into `getLightDarkColors`, so the `_light` / `_dark` colour params are part of a
  card's contract even though no card destructures them by name.
- **If a card exports something another card imports, move it to `common/`** — e.g.
  `createTextNode` moved from the stats card to `common/render.ts`, and the `lastYear`
  wording from the wakatime card's table to `common/locales.ts` on 2026-09-08. Ask before
  moving.
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
- **A test that provokes a diagnostic silences it, and `vi.spyOn(console, …)` is what does.**
  `common/log.ts` dispatches to `console` at call time for exactly this; it held the reference it
  captured at import until 2026-09-10, so the spy in the server's rate-limit test was a no-op and
  the run printed `PAT_1 Failed due to rate limiting` at whoever ran it. Three tests deliberately
  provoke one — the rate-limit reply, and the two organization refusals — and each spies with a
  line saying why. **Run `vitest run --disable-console-intercept` to see what the suite prints**:
  a pipe hides the `stdout |` blocks, which is why this survived several passes.
- **The vitest rules oxlint disagrees with are off in one place, with reasons.** A card
  test asserts on every node the card drew, so `max-expects` is off; the `?.` and `??`
  that `noUncheckedIndexedAccess` forces are not "conditionals in tests", so
  `no-conditional-in-test` is off; a file-level `beforeAll` applies to every suite in the
  file, so `require-top-level-describe` is off. `expect-expect` knows about the XSS
  suite's `expectNoScript` helper through `assertFunctionNames`.
