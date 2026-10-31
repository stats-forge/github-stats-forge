# AGENTS.md

Guidance for Claude Code in this repository, kept in the spirit of **compounding engineering**
([Every](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents)): every
review, bug and correction becomes a rule, and each rule links the change holding its full story.
Durable rules live here; pending work lives in `.claude/scratch/` (untracked).

## Before you change anything

- **Don't commit, push, open a PR or comment on one unless asked.** Leave changes in the working
  tree, and when a branch is wanted, say which commits are on it.
- **A change to `packages/*` carries a changeset, unasked** ([#15]); a visitor-visible `apps/docs`
  change carries one on the server ([#86]). See [Changesets](#changesets).
- **Run `pnpm check-all` before handing work over**: it is every check CI runs.
- **Redraw `apps/docs/public/cards` with `pnpm docs:cards` when a card's output changes** ([#225]).
- **Never hand-edit `packages/core/src/graphql/generated/**`**; change the `.graphql` and regenerate.
- **Keep the rule files true**: fix a rule in the change that broke it, unasked.

## What this is

A pnpm monorepo: the library that renders GitHub stats as SVG cards, the catalog of what each card
accepts, a CLI, an HTTP server, and the documentation site.

| Path               | What it is                                                              |
| ------------------ | ----------------------------------------------------------------------- |
| `packages/core`    | The library: fetchers, card renderers, themes, api handlers             |
| `packages/catalog` | What each card accepts: every option's param, label, kind and values    |
| `packages/cli`     | `github-stats-forge`: prompts for a card's options, writes the SVG      |
| `apps/server`      | The HTTP server over core's api handlers; **an image on GHCR, not npm** |
| `apps/docs`        | The site, Astro + Starlight; **not published**                          |
| `scripts/`         | Repo tooling such as `check-all.ts`, via `tsconfig.scripts.json`        |

**What a thing publishes to decides its rules, not its folder** ([#79]):

- `packages/*` go to npm and carry a changeset and a `lint:publish`; `apps/server` carries a
  changeset only, releasing with the npm packages; `apps/docs` carries neither.
- `build:packages` and `lint:publish` stay filtered to `./packages/*`. The root `typecheck` covers
  the packages, both apps and `scripts/`; the root vitest the packages and `apps/server`. `scripts/`
  has no tests.
- **`privatePackages: { version: true, tag: true }` plus a `version` on `apps/server/package.json`
  releases the server** ([#133]); `apps/docs` has no `version`, on purpose. `tag: true` only adds the
  git tag and release: changesets never publishes a `private` package.
- **`updateInternalDependencies: patch` bumps a core release's dependents**, so a card change reaches
  the image unnamed. Confirm with `pnpm exec changeset status`.

**A rule about one directory lives in that directory** ([#106]). Each `AGENTS.md` has a one-line
`CLAUDE.md` importing it, since Claude Code discovers only `CLAUDE.md`.

| File                                | Covers                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| `packages/core/AGENTS.md`           | The api layer as trust boundary; generated GraphQL types |
| `packages/core/src/cards/AGENTS.md` | Card branding, text and translations                     |
| `packages/catalog/AGENTS.md`        | The catalog                                              |
| `packages/cli/AGENTS.md`            | The CLI                                                  |
| `apps/server/AGENTS.md`             | The server and its image                                 |
| `apps/docs/AGENTS.md`               | The site                                                 |
| `apps/docs/src/anvil/AGENTS.md`     | The anvil and its browser tests                          |

- `packages/core/src` is `fetchers/` (network) → `cards/` (render) → `api/` (query-string handlers),
  plus `common/`, `themes/` and `graphql/`.
- **A card is a folder under `cards/`**: `index.ts` renders, `locales.ts` translates; only
  `cards/options.ts` sits loose ([#61]). A card too big for one file moves its layouts beside
  `index.ts`, which keeps the options and the render, as `top-languages/` and `stats/` do.
- **Every source file is TypeScript** except `packages/cli/bin.js`; generators are typechecked
  through a `tsconfig.scripts.json` ([#39]).

## Changesets

- **The first line is a conventional commit with no scope** (`feat: …`, `fix!: …`): it lands in the
  changelog under the package's name ([#78]). The body is one or two lines a consumer must act on,
  or none.
- **Pre-1.0, a breaking change is `minor`** ([#15]). A dependent package needs no entry of its own.
- **A visitor-visible `apps/docs` change is a server changeset** ([#86]): the image ships the site.
- **A tooling change that leaves the published output alone may go without one**: ask the owner.

## Commands

Run from the repo root.

```sh
pnpm test                 # vitest, whole workspace, one run (`pnpm exec vitest` watches)
pnpm test:coverage        # the same run, failing under a package's coverage floor (one CI leg runs this)
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

- **`pnpm run docs` needs the `run`**: `docs` is a pnpm builtin, and bare `pnpm docs` exits 0 ([#58]).
- **`check-all` stops at the first failure; `-k` runs them all.** Keep `scripts/check-all.ts` in step
  with `.github/workflows/ci.yml`.
- One package: `pnpm exec tsc -p tsconfig.typecheck.json`, or `pnpm exec vitest` inside it.
- **A lint script is per-package only when the tool is** ([#42]): oxlint runs once from the root;
  `lint:publish` checks one tarball, so the root runs it through `pnpm -r --filter "./packages/*"`.
- **Ordering is `pnpm -r`'s topological order**; `typecheck` builds first because each
  `tsconfig.typecheck.json` resolves core through its `.d.ts`. turbo cost more than it saved ([#41]);
  measure before reinstating one.
- **vitest applies `@stats/source` only when it is also under `ssr.resolve.conditions`**; see
  `packages/cli/vitest.config.ts`.

## Documentation and previews

- **A token never appears in a command the docs tell someone to run** ([#107]): it lands in shell
  history and `docker inspect`. Show `--env-file cards.env`, `-e PAT_1`, a secret manager or
  `--pat "$token"`, and link the self-hosting page's "Where the token lives".
- **`pnpm docs:cards` draws `apps/docs/cards` through the built CLI against the fictional account in
  `apps/docs/scripts/fixtures.ts`** ([#225]): no token, deterministic, and `docs:cards:check` fails CI
  on drift. The fixtures are typed as their queries' results, so a `.graphql` change fails
  `pnpm typecheck` until they follow.
- **Prose never states a count that grows with the code** ([#220]); only generated pages may.
- **Never call the person reading the docs "the reader"** ([#30]): say the browser for the user
  agent, and you, anyone or a visitor for a person. `screen reader` stays.
- **`pnpm test:live` alone touches the live APIs, and is not in CI** ([#226]). It draws each card
  with the anvil's `maximal` options (accounts overridable with `LIVE_TEST_*`) and asserts only that
  it drew, since live numbers drift.
  - **`.github/workflows/test-live.yml` runs it weekly, on demand, and on a push to `main` touching
    `fetchers/`, `graphql/` or the test**, with the `test-live` environment's `LIVE_TEST_PAT`. It stays
    off PRs, where it hit the rate limit ([#254]), and out of `ci.yml`, so an outage fails no PR.
  - **That secret is a PAT, as the docs advise**: classic with `read:org`, or fine-grained owned by
    the organization with `Members: read`. `GITHUB_TOKEN` cannot draw the gist or org cards.
- **Every untracked working file lives in `.claude/scratch/`**, the rule files excepted.

## TypeScript

TypeScript is **7.x**, with `oxlint-tsgolint` on the same major. The strict flags are in
`tsconfig.base.json`; the lint-enforced style (`Array<T>`, `_`-prefixed unused args,
`@ts-expect-error <description>`, no nullish values in template literals) is in
`@marcalexiei/oxlint-config/typescript`.

- **A relative import names the `.ts` file** ([#42]), through `allowImportingTsExtensions` and
  `rewriteRelativeImportExtensions`. Only the `.js` emit is rewritten: the `.d.ts` still says
  `./x.ts`, so don't fix it by hand, and keep `lint:publish`, which guards consumers against it. The
  GraphQL generator sets the extension twice: `importExtension` and the `prepend` literal in
  `packages/core/scripts/generate-graphql-types.ts`.
- **Never widen a signature to keep a test compiling; adapt the test.** Type a function to what its
  production call sites pass; `?: T | undefined` or `Partial<…>` only for a real caller forwarding
  `undefined`.
- **Declare only the params you read, and validate nothing you don't use.**
- **A card's options are `interface XCardOptions extends CommonCardOptions` in its `index.ts`**,
  unexported. `cards/options.ts` holds only the shared base and `CardOptions<T>`; `ThemeName` lives in
  `themes/index.ts`. `CommonCardOptions` extends `ColorParams`: every card forwards into
  `getLightDarkColors`.
- **What one card exports and another imports moves to `common/`**; ask first.
- **One export style per module**: named or default, never both ([#39]).
- **A function that branches gets a block body with an early `return` per outcome**, never a
  ternary expression body, and never a nested ternary. Conditional types are exempt.
- **An untyped dependency gets a `declare module` shim** (`tests/_css-to-object.d.ts`); a runtime
  dependency's lives under `src/`.
- **A dependency whose body is one literal is inlined** ([#31]): read a small package before adding
  it, and if copying costs a line and the licence allows it, copy it.

### tsconfig

- **Emit is opt-in**: `tsconfig.base.json` sets `noEmit`, and only each package's identical
  `tsconfig.build.json` emits. Don't repeat `noEmit`, and put no `outDir` on a config that cannot
  emit.
- **The build configs set `noCheck`**, so a green build proves nothing.
- **Each `tsconfig.typecheck.json` only clears `customConditions`**, resolving siblings through their
  `.d.ts` as a consumer would. `apps/docs` checks against core's source and has none.
- **Wrong build output? Check what the editor's `tsconfig.json` emits first**: a stray `outDir` once
  wrote tests into `build/`.
- **No project references**, so no `composite: true`.
- Strict-mode friction: `noUncheckedIndexedAccess` needs a guard or a `?? ''`;
  `noPropertyAccessFromIndexSignature` reads a `Record` by brackets; `exactOptionalPropertyTypes`
  takes `?: T | undefined` for a real `undefined`, else `NonNullable<…>`.

## Testing

The rules oxlint already enforces (the `.spec.ts` suffix, and the vitest rules switched off) carry
their reasons in `oxlint.config.ts`.

- **A test that can pass without the code it covers is a bug** ([#287]): break the code and watch it
  fail. `toHaveTextContent` matches a substring, so give it `exactly(text)` unless the assertion is
  about part of a longer text, such as a `<desc>`; an accepted query asserts `upstream`, since a
  rejection is an error too.
- **Restore what a test changes in an `afterEach`** ([#287]): timers, spies, `vi.stubEnv`, a
  `mkdtemp` dir. Never on its last line, which a failure skips.
- **Card specs read the card through `tests/_card.ts`, fetcher specs their requests through
  `tests/_fetch-mock.ts`** ([#288]); extend them rather than copy them.
- **A param's validation is tested once, in `apiParams.spec.ts`.**
- **`test:coverage` fails under a package's floor in `vitest.config.coverage.ts`**: raise a floor
  after adding tests, and lower one only with the owner. Every source file counts, so one no test
  imports reads as 0% rather than vanishing.
- **`src` never imports a test helper or library**; `no-restricted-imports` enforces it ([#288]).
- **Assert with jest-dom matchers**, never by reading the node. `expect(queryBy…()).toBeDefined()`
  cannot fail; count with `toHaveLength` on `queryAllBy*`.
- **Card tests assert on the DOM, not snapshots**, bar `renderWakatimeCard.spec.ts.snap`. Snapshots
  are byte-exact, so diff them after any card edit, and hoist a `${cond ? a : b}` out of a
  renderer's template literal, which the formatter may reflow into the SVG.
- **A test that provokes a diagnostic silences it with `vi.spyOn(console, …)`, saying why** ([#79]);
  `--disable-console-intercept` shows what the suite prints.
- **A test needing an upstream failure answers one; it never drops the request**: an `errors` body
  for GitHub, a `502` for WakaTime. A rejected fetch, `networkError()` or a `FetchMock` with no
  handler is a transport failure, which the retryer waits out for 4.1s; when the transport failure
  is the subject, use fake timers, as `retryer.spec.ts` does.
- **`packages/core` runs `pool: 'vmThreads'`; `isolate: false` breaks the `fetchTopLanguages` error
  tests** ([#122]), and `fsModuleCache` gained nothing. Re-measure before revisiting either.
- **The type test is `fetchRepo.types.spec-d.ts`**, checked by `tsc`; vitest would need
  `typecheck.include` ([#132]).
- Use `@testing-library/dom`'s `screen`, caching a repeated query. `querySelector` beats
  `getElementsByClassName`; type it `querySelector<HTMLElement>` when you need `.style`. Mock with
  `vi.mock(import('…'), factory)`. jest-dom registers in `packages/core/tests/_setup.ts`.
- **Type every piece of test data** ([#288]), including a mock's reply body (`GraphQLBody<Query>`,
  `GraphQLErrorBody`, `Refused`, `SearchBody`) and a `vi.fn()`'s resolved value, through
  `vi.fn<typeof fn>()` or a `satisfies`. A `Record` read by dot uses `satisfies`. Never cast a fake
  through `unknown`.
- **A fixture two specs share lives in an `_` module, never a spec** ([#288]): vitest runs an
  imported spec's tests twice.

## Comments

**A comment states the reason, never the behaviour**, usually in one line.

- **A `@file` block comes first**, after any shebang ([#79]).
- **No `@param` tags; `@returns` stays** ([#39]). A doc block is a summary, then `@returns`, plus
  `@see`, `@example` or `@deprecated` where earned.
- **A note on one parameter or property is a `/** */` on that declaration**, shown on hover, not a
  tag or a `//` comment; domain interfaces (`CardColors`, …) document their members that way.
- **Keep what the type cannot say**: a range, ordering, unit, fallback, format or side effect.
- When stripping tags mechanically, check for an orphaned continuation line.
- `require-returns-type` and `require-returns` stay off: the signature carries the type, and tags
  everywhere is a bigger decision than a rule.

## Linting and formatting

oxlint (type-aware, via `oxlint-tsgolint`) and oxfmt replaced eslint and prettier ([#39]), extending
`@marcalexiei/oxlint-config` and `@marcalexiei/oxfmt-config` from the sibling `void-0-configs`.

- **Fix a wrong shared config there**, not here.
- **Every local override carries its reason in `oxlint.config.ts`**; prefer a rule option to
  switching a rule off.
- **`import/no-cycle` has no exemptions**: untangle the cycle.
- **The autofixer is not a review**: typecheck, test and read the diff after `oxlint --fix`.

## Dependencies and pnpm

**Renovate runs self-hosted from `.github/workflows/renovate.yml`, configured by
`.github/renovate.json5`** ([#114]); its `customManagers` also move the docs' version pins.

- **Self-hosted for `postUpgradeTasks`**: its one allowed command,
  `.github/scripts/renovate-changeset.sh`, writes a `patch` changeset for a `dependencies` bump in
  `packages/*`, the only bump that reaches a consumer.
- **The workflow's cron fires; the config's `schedule` gates**, so per-manager windows are day-wide.
- **Dev dependency and Actions minors, patches, pins and digests automerge on a green `CI OK`**
  ([#137]); majors and `dependencies` stay manual. A later `packageRules` entry wins, so the
  held-back rules sit last.
  - **`CI OK` gates through `marcalexiei/github-actions/check-needs`, never `needs.*.result`**
    ([#328]): a matrix leg no runner picked up is cancelled, yet leaves its matrix at `success`.
    It judges only the jobs in its `needs`, so a new job goes there too.
- **Check the config with `renovate-config-validator` only**: `RENOVATE_PLATFORM=local` reverts
  tracked files and deletes untracked ones, so run it on a copy.

pnpm is **12.x** ([#110]); `pnpm-workspace.yaml` gives each setting's reason, and rejects an unknown key.

- **Two renames fail silently**: v11's `onlyBuiltDependencies` → `allowBuilds`, and v12's
  `--frozen-lockfile false` → `--no-frozen-lockfile`.
- **`allowBuilds` and the overrides list only packages still in the graph**: check with
  `pnpm why <pkg>`, since nothing polices an override ([#80]).
- **A stale lockfile can hold an orphan**: delete `node_modules` and `pnpm-lock.yaml`, then
  reinstall; deleting the lockfile alone reuses what is installed.
- **`minimumReleaseAge` exempts the first-party configs alone, by name** ([#216]).

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
[#287]: https://github.com/stats-forge/github-stats-forge/pull/287
[#288]: https://github.com/stats-forge/github-stats-forge/pull/288
[#328]: https://github.com/stats-forge/github-stats-forge/pull/328
