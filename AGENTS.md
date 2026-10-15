# AGENTS.md

Guidance for Claude Code when working in this repository.

Written in the spirit of **compounding engineering**: every review, bug and correction becomes a
rule the tooling applies next time
([Every, _Compound Engineering_](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents)).
Each rule links the change that produced it; the full story is in that change, not here.

Scope split: **this file holds the durable rules**; work not yet done lives in `.claude/scratch/`
(untracked). Rules go here, pending work goes there; don't duplicate across the two.

## Before you change anything

- **Don't commit, push, open a PR or comment on one unless asked.** The repo owner usually does
  that; leave changes in the working tree, and when a branch is wanted, say which commits are on it.
- **A change to `packages/*` carries a changeset, written without being asked** ([#15]); a change to
  `apps/docs` a visitor would notice carries one on the _server_ ([#86]). See [Changesets](#changesets).
- **Run `pnpm check-all` before handing work over.** It is every check CI runs.
- **Never put a token in a command the documentation tells someone to run** ([#107]).
- **Redraw `apps/docs/public/cards` with `pnpm docs:cards` when a card's output changes**; CI fails
  on a stale preview ([#225]).
- **Never hand-edit `packages/core/src/graphql/generated/**`** — change the `.graphql` and regenerate.
- **Keep the rule files true.** Fix a rule in the same change that broke it; no need to ask.

## What this is

`github-stats-forge` — a pnpm monorepo holding the library that renders GitHub stats as SVG cards,
the catalog of what each card accepts, the CLI that writes one to a file, the server that serves them
over HTTP, and the site that documents them all.

| Path               | What it is                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `packages/core`    | The library: fetchers, card renderers, themes, api handlers                                                   |
| `packages/catalog` | What each card accepts: every option's param, label, kind and accepted values                                 |
| `packages/cli`     | `github-stats-forge`: prompts through a card's options, writes the SVG, saves and reloads a card's config     |
| `apps/server`      | The HTTP server over core's api handlers, and the container image it ships in; **published to GHCR, not npm** |
| `apps/docs`        | The documentation site — Astro + Starlight, every page markdown; **not published**                            |
| `scripts/`         | Repo-level tooling — `check-all.ts`, via `tsconfig.scripts.json`                                              |

**What a thing publishes to decides its rules, not which folder it sits in** ([#79]).

- A package under `packages/` goes to npm: it carries a changeset and a `lint:publish`.
- `apps/docs` publishes nothing and carries neither.
- `apps/server` publishes an image: it carries a changeset and no `lint:publish`, and is released
  with the npm packages under the version changesets set.
- `build:packages` and `lint:publish` stay filtered to `./packages/*`. The root `typecheck` covers
  the packages, both apps and `scripts/`; the root vitest projects the packages and `apps/server`.
  `scripts/` has no tests.
- **`privatePackages: { version: true, tag: true }` plus a `version` field on
  `apps/server/package.json` is what releases the server.** `apps/docs` has no `version` field, on
  purpose. `tag: true` cannot leak a private package onto npm — changesets drops every `private`
  package before publishing — it adds the git tag and the GitHub release ([#133]).
- **`updateInternalDependencies: patch` means a core release bumps its dependents**, so a card
  change reaches the image without naming the server. Confirm with `pnpm exec changeset status`.

**A rule about one directory lives in that directory** ([#106]). This file holds what crosses
directories, and what must be known before choosing one:

| File                                | What it covers                                                       |
| ----------------------------------- | -------------------------------------------------------------------- |
| `packages/core/AGENTS.md`           | The api layer as the trust boundary, and the generated GraphQL types |
| `packages/core/src/cards/AGENTS.md` | Card branding, card text and translations                            |
| `packages/catalog/AGENTS.md`        | The catalog of what each card accepts                                |
| `packages/cli/AGENTS.md`            | The CLI                                                              |
| `apps/server/AGENTS.md`             | The server and the container image it ships in                       |
| `apps/docs/AGENTS.md`               | The documentation site                                               |
| `apps/docs/src/anvil/AGENTS.md`     | The anvil, its controls and its browser tests                        |

- **Each `AGENTS.md` has a one-line `CLAUDE.md` beside it that imports it.** Claude Code discovers
  `CLAUDE.md`, not `AGENTS.md` (verified on 2.1.263), so the stub is what loads the rules.
- `packages/core/src` is `fetchers/` (network) → `cards/` (SVG render) → `api/` (query-string
  handlers), with `common/` for shared helpers, `themes/` for the theme table and `graphql/` for
  query text and its generated types.
- **A card is a folder under `cards/`**: its renderer as `index.ts`, its translations as
  `locales.ts`. Only `cards/options.ts` sits loose beside them ([#61]).
- **Every source file is TypeScript**, `packages/cli/bin.js` excepted — see `packages/cli/AGENTS.md`.
  Generators are covered by a `tsconfig.scripts.json`, so CI typechecks them ([#39]).

## Changesets

- **The summary's first line is a conventional commit with no scope** — `feat: …`, `fix!: …` —
  because it lands verbatim in the changelog under the package's own name ([#78]). Blank line, then
  a few lines of prose.
- **The packages are pre-1.0, so a breaking change is `minor`**, not `major` ([#15]).
- **A dependent package needs no entry of its own**; `updateInternalDependencies` bumps it.
- **A visitor-visible `apps/docs` change is a server changeset** ([#86]): the image ships the site,
  and `apps/docs` has no `version`, so a docs-only changeset has nothing to bump.
- **A pure tooling change that leaves the published output alone may go without one** — that is
  the owner's call, so ask.

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
pnpm docs:cards:check     # build, then fail if a committed preview is out of date
pnpm docs:e2e             # build the site, then run the anvil's browser tests
pnpm check-all            # every check CI runs, cheapest first, in one command
pnpm test:live            # draw every card from the live APIs; needs PAT_1 in the root .env
```

After touching any `src/graphql/queries/*.graphql`:

```sh
pnpm --filter ./packages/core/ run generate-graphql-types   # rewrite src/graphql/generated
pnpm --filter ./packages/core/ run check-graphql-types      # what CI runs; fails on drift
```

- **`pnpm run docs` needs the `run`.** `docs` is a pnpm builtin, so bare `pnpm docs` never reaches
  the script — and still exits 0 ([#58]).
- **`check-all` stops at the first failure; `-k` runs the whole list.** Keep `scripts/check-all.ts`
  in step with `.github/workflows/ci.yml`, or a check fails after the push instead of before it.
- Per-package typecheck: `pnpm exec tsc -p tsconfig.typecheck.json`.
- **A lint script is per-package only when the tool is** ([#42]). oxlint sweeps the workspace in one
  pass from the root; `lint:publish` examines one tarball, so each package owns it and the root runs
  `pnpm -r --filter "./packages/*" run lint:publish`, covering a new package the day it appears.
- **Task ordering is `pnpm -r`'s topological order, not a task runner's.** `typecheck` builds first
  because each `tsconfig.typecheck.json` resolves core through its built `.d.ts`. turbo was removed
  for costing more than it saved ([#41]); measure before reinstating one.
- **vitest applies the `@stats/source` condition only when it is also under
  `ssr.resolve.conditions`** — see `packages/cli/vitest.config.ts`. Running `pnpm exec vitest`
  inside a package is the quick way to iterate on one suite.

## Documentation and previews

- **A token never appears in a command the docs tell someone to run** ([#107]): it lands in shell
  history and `docker inspect`. Show `--env-file cards.env`, a pass-through `-e PAT_1`, a secret
  manager, or `--pat "$token"`; link the self-hosting page's "Where the token lives" rather than
  restating it.
- **`apps/docs/public/cards` is committed, so redraw it when a card's output changes** ([#225]).
  `pnpm docs:cards` renders `apps/docs/cards` through the built CLI with `fetch` answered by the
  fictional account in `apps/docs/scripts/fixtures.ts`: no token, deterministic output, and
  `pnpm docs:cards:check` fails in CI on drift. Each fixture is typed as its query's generated
  result, so **a `.graphql` change fails `pnpm typecheck` until `fixtures.ts` follows it**.
- **Prose never states a count that grows with the code** — "the [themes]", not a number ([#220]).
  Only generated pages, such as `customization/themes.md`, may.
- **Don't call the person reading the docs "the reader"** ([#30]): say **the browser** where the
  subject is the user agent, and **you**, **anyone** or **a visitor** where it is a person.
  `screen reader` stays.
- **`pnpm test:live` is the one check that touches the live APIs, and it is not in CI** ([#226]).
  `apps/docs/scripts/test-live.ts` draws each card with the anvil's `maximal` options for real
  accounts (overridable with the `LIVE_TEST_*` variables) and asserts only that it drew, since live
  numbers drift.
  - **`.github/workflows/test-live.yml` runs it with the `LIVE_TEST_PAT` secret of the `test-live`
    environment**, weekly, on demand, and on a push to `main` touching `fetchers/`, `graphql/` or the
    test. It stays out of `ci.yml` so a GitHub outage cannot fail an unrelated PR, and off PRs since
    a run on one hit the token's rate limit ([#254]).
  - **The secret is a personal access token, because the docs tell people to use one**: classic with
    `read:org`, or fine-grained with the organization as owner and `Members: read`. The workflow's
    `GITHUB_TOKEN` cannot draw the gist or org cards.
- **Every untracked working file lives in `.claude/scratch/`**; the rule files are the exception.

## TypeScript conventions

TypeScript is **7.x**, and `oxlint-tsgolint` tracks the same major so the two agree. The strict
flags are in `tsconfig.base.json`; the lint-enforced style (`Array<T>`, `_`-prefixed unused args,
`@ts-expect-error <description>`, no nullish values in template literals) is in
`@marcalexiei/oxlint-config/typescript`.

- **A relative import names the file that exists, so the extension is `.ts`** ([#42]), allowed by
  `allowImportingTsExtensions` plus `rewriteRelativeImportExtensions`.
  - **Only the `.js` emit is rewritten; the `.d.ts` emit still says `./x.ts`.** Don't fix those by
    hand and don't drop `lint:publish` — it is the only check standing between this convention and
    a consumer whose toolchain is less forgiving than `tsc`.
  - **The GraphQL generator carries the extension twice**: `importExtension: '.ts'` and the
    `prepend` literal in `packages/core/scripts/generate-graphql-types.ts`.
- **Never widen a signature to keep an old test compiling — adapt the test.** Type a function to
  what its production call sites pass; upstream had to narrow `trimTopLanguages` back in its PR #476.
  Add `?: T | undefined` or `Partial<…>` only for a real caller forwarding `undefined`.
- **Declare only the params you read, and validate nothing you don't use.** A validated-but-unread
  `locale` once rejected a query for an option that could not change the output.
- **Colocate card options**: `interface XCardOptions extends CommonCardOptions {…}` in the card's
  `index.ts`, not exported. `cards/options.ts` holds only the shared base and `CardOptions<T>`; the
  `ThemeName` union lives in `themes/index.ts`.
- **`CommonCardOptions` extends `ColorParams`**: every card forwards its options into
  `getLightDarkColors`, so the `_light` / `_dark` params are part of its contract.
- **What one card exports and another imports moves to `common/`.** Ask before moving.
- **One export style per module** ([#39]): a name, or a default, never both.
- **A function that branches gets a block body: each outcome an `if` with an early `return`.** Not
  an arrow expression body built from a ternary, and never a nested ternary anywhere; a one-line body
  with no branching is fine. Type-level conditional types are the exception, having no `if`.
- **An untyped dependency gets a `declare module` shim** — `@uppercod/css-to-object` →
  `tests/_css-to-object.d.ts`. A runtime dependency's shim lives under `src/`, where the build sees it.
- **A dependency whose whole body is one literal is inlined** ([#31]), as `GITHUB_USERNAME_PATTERN`
  replaced `github-username-regex`. Read a small package before adding it; if copying costs a line
  and the licence allows it, copy it.

### tsconfig layout and emit

- **Emit is opt-in.** `tsconfig.base.json` sets `noEmit`; only each published package's
  `tsconfig.build.json` opts back in, and those are byte-identical. Don't repeat `noEmit`, and don't
  put an `outDir` on a config that cannot emit.
- **`noCheck: true` in the build configs means a green build proves nothing** — run `pnpm check-all`.
- **Each `tsconfig.typecheck.json` only clears `customConditions`**, so the check resolves siblings
  through built `.d.ts` as a consumer would. `apps/docs` has none: it is not published, and
  typechecks against core's source — though its `astro build` needs the packages built.
- **When build output is wrong, check what the editor's `tsconfig.json` emits first.** A stray
  `outDir` there once wrote tests into `build/`.
- **No project references**, so don't reach for `composite: true`.

### Strict-mode friction to expect

- `noUncheckedIndexedAccess`: `lines[i] += s` becomes `lines[i] = (lines[i] ?? "") + s`; a lookup
  feeding a non-optional return needs a guard.
- `noPropertyAccessFromIndexSignature`: read a `Record` through brackets or `Object.entries`.
- `exactOptionalPropertyTypes`: declare the receiving param `?: T | undefined` when a real caller
  forwards `undefined`, or `NonNullable<…>` when it never does — after re-reading the widening rule.

## Testing

Rules oxlint already enforces — the `.spec.ts` suffix, and the vitest rules switched off — carry
their reasons in `oxlint.config.ts`.

- **Assert on DOM nodes with jest-dom matchers, never by reading the node yourself** —
  `toHaveTextContent`, `toHaveAttribute`, `toBeInTheDocument`. **Never write
  `expect(queryBy…(…)).toBeDefined()`**: `null` is defined, so it cannot fail. For array indices,
  assert `toHaveLength(n)` on the `queryAllBy*` result.
- **Card tests assert on the rendered DOM, not snapshots**; the one exception is
  `renderWakatimeCard.spec.ts.snap`.
- **Snapshots are byte-exact.** The formatter can reflow a `${cond ? a : b}` inside a renderer's
  template literal onto its own line, injecting whitespace into the SVG; hoist such expressions into
  a `const`, and diff the snapshots after any card edit.
- **A test that provokes a diagnostic silences it with `vi.spyOn(console, …)`**, saying why ([#79]).
  `common/log.ts` reads `console` at call time so the spy works; run
  `vitest run --disable-console-intercept` to see what the suite prints.
- **`packages/core` runs on `pool: 'vmThreads'`, and `isolate: false` is not an option** ([#122]):
  the `fetchTopLanguages` error tests share module state once files stop being isolated.
  `fsModuleCache` was measured and gained nothing. Re-measure before re-litigating either.
- **The type test is `fetchRepo.types.spec-d.ts`**, which vitest's own `typecheck.include` would not
  collect ([#132]). `tsc` checks it; enabling vitest's typecheck means setting `typecheck.include`.
- Use the `@testing-library/dom` **`screen` API**, and cache a repeated same-id query.
  `querySelector` is fine; prefer it to `getElementsByClassName`, and type it
  `querySelector<HTMLElement>(…)` when you need `.style`.
- Mock with the typesafe `vi.mock(import("…"), factory)`, keeping the static import for its types.
- jest-dom's matchers are registered and typed by importing `@testing-library/jest-dom/vitest` in
  `packages/core/tests/_setup.ts`.
- **Type test fixtures** (`const data: StatsData = …`); a `Record` fixture you read by dot uses
  `satisfies` instead, to keep its concrete keys.

## Comments

**A comment states the reason, never the behaviour.** Write it, then delete every sentence the code
already says; what survives is usually one line.

- **A `@file` block is the first thing in its file**, after any shebang and before the imports
  ([#79]). Nothing enforces it.
- **There are no `@param` tags; `@returns` stays** ([#39]). Under TypeScript a `@param` restated the
  signature and nothing checked it.
- **A doc block is a summary, then `@returns`**, plus `@see` / `@example` / `@deprecated` where they
  earn it.
- **A note about one parameter or property goes on that declaration as a `/** */`**, where an editor
  shows it on hover — not as a tag, and not as a `//` comment.
- **Keep what the type cannot say**: a range, an ordering, a unit, a fallback, a format guarantee or
  a side effect.
- **Domain interfaces** (`CardColors`, …) document their members inline with `/** */`.
- **When stripping tags mechanically, check for an orphaned continuation line.**
- The jsdoc rules on are in `oxlint.config.ts`. `require-returns-type` stays off because the
  signature carries the type; `require-returns` stays off because adding tags everywhere is a
  bigger decision than a lint rule should make.

## Linting and formatting

oxlint (type-aware, via `oxlint-tsgolint`) and oxfmt replaced eslint and prettier ([#39]). Their
configs extend the owner's `@marcalexiei/oxlint-config` and `@marcalexiei/oxfmt-config`, developed
in the sibling `void-0-configs` checkout.

- **When the shared config is wrong, fix it there**, not with a workaround here.
- **Every local override carries its reason, in `oxlint.config.ts`.** An override with no reason is
  a silenced rule.
- **Prefer a rule option to switching a rule off.**
- **`import/no-cycle` has no exemptions.** Untangle a cycle rather than disable the rule for it.
- **The autofixer is not a review.** Typecheck and test after `oxlint --fix`, and read the diff.

## Dependencies and pnpm

**Renovate keeps the dependencies current, self-hosted from `.github/workflows/renovate.yml`**
([#114]). Its config is `.github/renovate.json5`; its `customManagers` also move the version pins in
the documentation's markdown, which Dependabot could not.

- **It is self-hosted because `postUpgradeTasks` is a self-hosted-only option**, and that is what
  writes a changeset. The one allowed command is `.github/scripts/renovate-changeset.sh`, listed in
  `RENOVATE_ALLOWED_COMMANDS`.
- **A `dependencies` bump in `packages/*` writes its own `patch` changeset; nothing else does.** A
  dev dependency reaches no consumer.
- **The workflow's cron is the heartbeat; the config's `schedule` is the gate.** A per-manager window
  must contain the time the workflow fires, so windows are day-wide.
- **A dev dependency automerges once `CI OK` is green** on a minor, patch, pin or digest ([#137]).
  Majors and `dependencies` bumps stay manual.
- **Check a config change with `renovate-config-validator`, and nothing else on this checkout.**
  `RENOVATE_PLATFORM=local` reverts tracked files and removes untracked ones; run it on a copy.
- **A later `packageRules` entry wins**, so the held-back rules sit after the groups.

pnpm is **12.x** ([#110]). `pnpm-workspace.yaml` carries the reason beside each setting.

- **Two renames stop applying silently**: v11's `onlyBuiltDependencies` → `allowBuilds`, and v12's
  `--frozen-lockfile false` → `--no-frozen-lockfile`. v12 does reject an unknown key in
  `pnpm-workspace.yaml`.
- **`allowBuilds` lists only packages still in the graph.** Check with `pnpm why <pkg>`.
- **A stale lockfile can hold a package nothing depends on.** Delete `node_modules` **and**
  `pnpm-lock.yaml`, then reinstall; deleting the lockfile alone reuses what is installed.
- **`minimumReleaseAge` exempts only the first-party configs, by name** ([#216]): the cooling-off
  period is there to catch a third-party publish going bad.
- **Nothing polices an override.** Check one with `pnpm why <pkg>` when you touch it ([#80]).

[#15]: https://github.com/stats-forge/github-stats-forge/pull/15
[#30]: https://github.com/stats-forge/github-stats-forge/pull/30
[#31]: https://github.com/stats-forge/github-stats-forge/pull/31
[#39]: https://github.com/stats-forge/github-stats-forge/pull/39
[#41]: https://github.com/stats-forge/github-stats-forge/pull/41
[#42]: https://github.com/stats-forge/github-stats-forge/pull/42
[#58]: https://github.com/stats-forge/github-stats-forge/pull/58
[#61]: https://github.com/stats-forge/github-stats-forge/pull/61
[#78]: https://github.com/stats-forge/github-stats-forge/pull/78
[#79]: https://github.com/stats-forge/github-stats-forge/pull/79
[#80]: https://github.com/stats-forge/github-stats-forge/pull/80
[#86]: https://github.com/stats-forge/github-stats-forge/pull/86
[#106]: https://github.com/stats-forge/github-stats-forge/pull/106
[#107]: https://github.com/stats-forge/github-stats-forge/pull/107
[#110]: https://github.com/stats-forge/github-stats-forge/pull/110
[#114]: https://github.com/stats-forge/github-stats-forge/pull/114
[#122]: https://github.com/stats-forge/github-stats-forge/pull/122
[#132]: https://github.com/stats-forge/github-stats-forge/pull/132
[#133]: https://github.com/stats-forge/github-stats-forge/pull/133
[#137]: https://github.com/stats-forge/github-stats-forge/pull/137
[#216]: https://github.com/stats-forge/github-stats-forge/pull/216
[#220]: https://github.com/stats-forge/github-stats-forge/pull/220
[#225]: https://github.com/stats-forge/github-stats-forge/pull/225
[#226]: https://github.com/stats-forge/github-stats-forge/pull/226
[#254]: https://github.com/stats-forge/github-stats-forge/pull/254
