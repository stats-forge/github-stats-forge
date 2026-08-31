# CLAUDE.md

Guidance for Claude Code when working in this repository.

This file is written in the spirit of **compounding engineering** — the practice of
turning every code review, bug, and correction into a permanent lesson the tooling
applies automatically, so each unit of work makes the next one easier rather than harder
([Every, _Compound Engineering: How Every Codes With Agents_](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents);
[guide](https://every.to/guides/compound-engineering)). Practically: when a reviewer
pushes back, a rule lands here — not in a chat message that evaporates. Each rule below
cites the incident that produced it, because the incident is what makes it stick.

Scope split: **this file holds the durable rules**.
`.claude/scratch/CORE_TYPESCRIPT_MIGRATION.md` (untracked scratch) holds the _state_ of
the in-flight `packages/core` JS→TS migration — which module is converted, what each PR
did, what's deferred. Rules go here, progress goes there; don't duplicate across the two.

## What this is

`github-stats-forge` — a pnpm + turbo monorepo holding the library that renders
GitHub stats as SVG cards. The server and the docs site that used to live here are
gone: consumers (the GitHub Action, any self-hosted endpoint) import the package.

| Path            | What it is                                                            |
| --------------- | --------------------------------------------------------------------- |
| `packages/core` | The library: fetchers, card renderers, themes, api handlers           |
| `scripts/`      | Repo-level tooling — `assert-deduped.ts`, via `tsconfig.scripts.json` |

`packages/core/src` is laid out as `fetchers/` (network) → `cards/` (SVG render) →
`api/` (query-string handlers), with `common/` for shared helpers, `themes/` for the
theme table and `graphql/` for query text and its generated types.

## Commands

Run from the **repo root** unless stated otherwise.

```sh
pnpm test                 # vitest, whole workspace
pnpm test:coverage        # vitest with the coverage config
pnpm typecheck            # turbo typecheck + tsc -p tsconfig.scripts.json
pnpm lint                 # turbo lint (eslint per package)
pnpm lint:eslint          # eslint directly (`:fix` to autofix)
pnpm lint:knip            # unused files/exports/deps
pnpm lint:deps            # scripts/assert-deduped.ts — fails on duplicated deps
pnpm format               # prettier --write . (`format:check` in CI)
pnpm build:packages       # build packages/*
```

Per-package (from `packages/core`): `pnpm exec tsc -p tsconfig.typecheck.json` and
`pnpm exec eslint`.

GraphQL types are generated, so run these from the repo root after touching any
`src/graphql/queries/*.graphql`:

```sh
pnpm --filter ./packages/core/ run generate-graphql-types   # rewrite src/graphql/generated
pnpm --filter ./packages/core/ run check-graphql-types      # what CI runs; fails on drift
```

The root `vitest.config.ts` is a `projects` workspace over `packages/core`. Running
`pnpm exec vitest` inside the package also works and is the quick way to iterate on
one suite.

pnpm is held at **10.x** out of inertia: bumping to 11 wants a lockfile regeneration
and a CI run, so it is a change of its own.

## Working agreements

- **Don't commit or open PRs** — the repo owner does that. Leave changes in the working
  tree.
- **Don't edit this file unless explicitly asked.** Auditing it, reporting stale rules,
  or proposing wording is fine unprompted; writing the change is not. A rule lands here
  only when the repo owner says so.
- **Every untracked working file lives in `.claude/scratch/`** — PR summaries, review
  replies, design plans and the migration handoff, all in one ignored folder instead of
  scattered across the repo root. This file is the exception: `CLAUDE.md` stays at the
  root, the only project path Claude Code loads on its own.
- **Always write/update a PR summary** for the change in flight, unasked. Keep it
  genuinely short: 3–5 bullets, no tables. Spell out "TypeScript", never "TS", in the
  title.
- **Name the summary after the change, not `PR_SUMMARY.md`.** Use
  `<SUBJECT>_PR_SUMMARY.md`, all uppercase, snake_case subject — e.g.
  `CORE_TYPESCRIPT_MIGRATION_PR_SUMMARY.md`. One file per line of work, so a second PR
  opened alongside the first doesn't clobber its summary and the filename says which
  change it belongs to at a glance. Update the matching file if one already exists;
  create a new one when the change is genuinely separate. These are untracked scratch —
  don't commit them with the PR.
- **Answer a PR review in `PR_<NUMBER>_REVIEW_REPLY.md`**, not in chat — each point
  quoted above a short reply. Say so when a review asks for wording that was already
  there. Untracked scratch; if the repo owner edited it, build on their text.
- Keep code comments short — one line, and only for what the code cannot show itself.
- `.claude/scratch/CORE_TYPESCRIPT_MIGRATION.md` is the running handoff for the
  ongoing `packages/core` JS→TS migration. Read it before touching `packages/core`, keep
  it current, and don't commit it with a PR.

## TypeScript conventions

The codebase is mid-migration from JSDoc-annotated `.js` to real `.ts`, one module per
small PR. `packages/core/src` is fully converted — `fetchers/`, `cards/` and `api/`
are all `.ts`. `packages/core/tsconfig.json` still sets `allowJs: true` for the two
remaining `.js` test files (`tests/apiInputValidation.test.js`, `tests/xss.test.js`);
it gets dropped once those convert.

`tsconfig.base.json` is strict and then some — `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noUnusedLocals`,
`noUnusedParameters`, `verbatimModuleSyntax`, `isolatedModules`, `module: nodenext`.

**Never widen a signature just to keep an old test compiling — adapt the test to the
code.** Type every function to the contract its _production_ call sites actually use. If
a `.js`-era test called it with something looser, fix the test. This was a real
regression: the top-languages conversion typed
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
  yet the gist card has no translated text and never read it, so `?locale=xx` returned
  "Language not found" for an option that could not have changed the output. It now lives
  on the four card options that do read it (`repo`, `stats`, `top-languages`, `wakatime`)
  and is gone from the gist handler entirely. Applies to every card and handler from here
  on.
- **Colocate card options.** Each card declares `interface XCardOptions extends
CommonCardOptions {…}` (an interface, not `type &`) in its own file, **not exported** —
  knip flags it, and only that card uses it. All five cards do this, so
  `cards/options.ts` holds only the shared base: `CommonCardOptions`, plus the
  `CardOptions<T>` helper below. The `ThemeName` union lives in `themes/index.ts`.
- **`CommonCardOptions` extends `ColorParams`.** Every card forwards its whole options
  object into `getLightDarkColors`, so the `_light` / `_dark` colour params are part of a
  card's contract even though no card destructures them by name.
- **If a card exports something another card imports, move it to `common/`** — e.g.
  `createTextNode` moved from the stats card to `common/render.ts`. Ask before moving.
- Prefer `Array<T>` over `T[]` (`@typescript-eslint/array-type: generic`).
- No `string | undefined` or `null` inside template literals
  (`restrict-template-expressions` with `allowNullish: false`); resolve with `??` first.
- No `@ts-check` / `@ts-ignore` — use real types. For deliberate misuse in tests,
  `// @ts-expect-error <description>` (the description is required by `ban-ts-comment`),
  and delete it once the call becomes valid.
- Unused args are only allowed with a leading `_`.
- Untyped deps with no `exports`-mapped declaration get a `declare module` shim:
  `@uppercod/css-to-object` → `tests/_css-to-object.d.ts`; `emoji-name-map` →
  `src/_emoji-name-map.d.ts` and `github-username-regex` →
  `src/_github-username-regex.d.ts` (runtime deps' shims have to live under `src/` for the
  build config to see them).

### The api layer is the trust boundary

`api/*` turns a query string into card options, so **parse and validate there once** and
hand the render functions typed values — defaults stay with the renderer. A handler
declares `interface XApiQuery extends ColorParams { … }` with every field a `string`,
because that is what a query string yields, and returns the shared `ApiResult` from
`api/types.js`.

- **The api parses; the card defaults.** A handler turns strings into typed values
  (`parseBoolean`, `parseFloat`, `toLowerCase`) and stops there — it never supplies a
  fallback the render function already owns. `parseBoolean(x) ?? false` alongside the
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
- **Match the coercion the callee already performed.** `border_radius` is `parseFloat`d in
  `api/gist.ts` because `Card` did `parseFloat(String(border_radius))` internally, so
  `?border_radius=10px` still renders `rx="10"`; `Number()` would also have made
  `?border_radius=` a silent `0` instead of an error.
- **`CardOptions<T>`** (`cards/options.ts`) is `Partial<T>` that also accepts an
  explicit `undefined`. Render functions take it because a handler forwards params that
  may legitimately be absent.
- **Leave `theme` a raw string — `getCardColors` normalises it.** Card options type it as
  `string`, not the `ThemeName` union, because that is what a handler receives and
  `getCardColors` already resolves an unknown name to `themes.default`. Narrowing it at the
  boundary buys nothing and costs a cast; the `isThemeName` guard in `themes/index.ts`
  belongs in `getCardColors`, which is the one place that does the resolving.

### tsconfig layout and emit

**Emit is opt-in.** `tsconfig.base.json` sets `noEmit: true`, and
`packages/core/tsconfig.build.json` is the _only_ config in the repo that opts back in
(`noEmit: false` + `rootDir: "./src"` + `outDir: "./build"`, plus `declaration` and
`declarationMap`). Nothing else in the repo emits. Don't add `noEmit` to a config that
already inherits it, and don't put an `outDir` on a config that can't emit.

The build config also sets **`noCheck: true`** — `pnpm build` emits without typechecking,
because the `typecheck` task does that separately against `tsconfig.typecheck.json`. A
green build is therefore not evidence the types are sound; run `pnpm typecheck` too. Each
package's `tsconfig.typecheck.json` exists only to clear `customConditions`, so the check
runs against built `.d.ts` the way a consumer would resolve them rather than through the
`@stats/source` condition.

This came from `packages/core/tsconfig.json` — the config the editor and a bare `tsc`
pick up — carrying `outDir: "build"` while including `tests`. Any stray `tsc` in the
package wrote `build/src`, `build/tests` and `build/vitest.config.js`; turbo then captured
that under its `build/**` outputs, so every later `pnpm build:packages` replayed the test
files back into `build/` on a cache hit and the build _looked_ like it was producing them.
When build output is wrong, suspect the turbo cache before the compiler: force a real run
with `pnpm exec turbo run build "--filter=./packages/*" --force`, and clear a poisoned
entry by removing `packages/core/.turbo`, `node_modules/.cache/turbo` and `.turbo/cache`.

There are no TypeScript project references anywhere, so don't reach for `composite: true`
— it was removed from both apps, where its only live effect was forcing declaration emit.

### Generated GraphQL types

Query text lives in `src/graphql/queries/*.graphql`, never inline in a fetcher. Each file
generates `src/graphql/generated/<name>.ts`, plus a shared `common.ts` for the enums and
scalars the variables name. **Never hand-edit `src/graphql/generated/**` — change the
query and regenerate;** the folder is committed and both eslint and knip ignore it, so
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
`YearContributions` verbatim while importing `YearContributionsFragment` from
`generated/stats.js`. That duplication is unguarded: nothing fails if the `.graphql`
fragment and the copy drift apart, so change both together and keep the comment pointing
at the source.

The alternative — one static `($login, $from, $to)` query fetched per year in parallel —
was tried and dropped: it costs ~1 rate-limit point per account year instead of 1
total. Fetchers still never contain query text.

The generator (`packages/core/scripts/generate-graphql-types.js`) is deliberately
dev-only — no codegen dependency reaches consumers. It is plain `.js`, and
`packages/core/tsconfig.json` includes only `src`, `tests` and `vitest.config.ts`, so
nothing typechecks the package's `scripts/` and its JSDoc types are not verified by CI.
That is specific to the package: the repo-root `scripts/` **is** covered, by
`tsconfig.scripts.json` under `pnpm typecheck`.

### JSDoc

- Param docs use **`@param props.x`**, with the object type written inline at the call
  site rather than as a named `Options` interface. Keep the root `@param props` line —
  the nested lines need it. `jsdoc/check-param-names` (an error on TS files) keeps those
  path strings in sync with the destructured parameters, which is what makes the
  convention safe; it also descends into nested option objects, so a nested property
  needs its full `@param args.renderOptions.x` path.
- Delete a dead param rather than documenting it — an unused one that stays only to
  satisfy a doc block is a lint error waiting to happen.
- Keep `@param`/`@returns` that carry real information (scalar params, return
  descriptions); drop the ones that just restate the type.
- **Domain interfaces** (`CardColors`, `Config`, …) — data shapes that aren't one
  function's parameter object — document their members inline with `/** */`.

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
  their whitespace verbatim, and prettier will reflow a multi-line `${cond ? a : b}`
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
  `getByTestId(document.body, "x")` — https://testing-library.com/docs/queries/about/#screen.
  Cache a repeated same-id query in a local variable. Plain
  `document.querySelector` is still fine.
- Mock with the typesafe form `vi.mock(import("…"), factory)`, not
  `vi.mock("…", factory)`, and keep the static import for its types.
- jest-dom matchers are typed in `packages/core/tests/_setup.ts`, which augments vitest's
  `Matchers` interface inside `declare module "vitest"` (vitest 4 re-exports
  `Assertion`/`Matchers` from `@vitest/expect`, so augmenting `vitest` is the path that
  works — https://vitest.dev/guide/extending-matchers).
- Reach for `querySelector`/`querySelectorAll` over `getElementsByClassName`, and
  `document.querySelector<HTMLElement>(…)` when you need `.style`. Under the strict
  flags, `cssToObject(styleTag?.innerHTML ?? "")` and
  `stylesObject[":host"]?.[".header "]?.["fill"]?.trim()` are the working shapes.
- **Type test fixtures** (`const data: StatsData = …`). When a fixture is a `Record<…>`
  that you also access by dot, annotating it would trip
  `noPropertyAccessFromIndexSignature` — use `… satisfies TopLangData` instead, which
  validates against the type while keeping the concrete keys.
