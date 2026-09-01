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
`packages/core` becomes several packages) and `CORE_HTTP_TRANSPORT.md` (whether axios
gives way to an injected `fetch`).

## What this is

`github-stats-forge` — a pnpm + turbo monorepo holding the library that renders
GitHub stats as SVG cards. The server and the docs site that used to live here are
gone: consumers (the GitHub Action, any self-hosted endpoint) import the package.

| Path            | What it is                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `packages/core` | The library: fetchers, card renderers, themes, api handlers                                               |
| `packages/cli`  | `github-stats-forge`: prompts through a card's options, writes the SVG, saves and reloads a card's config |
| `scripts/`      | Repo-level tooling — `assert-deduped.ts`, via `tsconfig.scripts.json`                                     |

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
pnpm format               # oxfmt --write . (`format:check` in CI)
pnpm build:packages       # build packages/*
```

Per-package (from either package): `pnpm exec tsc -p tsconfig.typecheck.json` and
`pnpm exec eslint`.

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

pnpm is **11.x**. The v11 rename of `onlyBuiltDependencies` to the `allowBuilds` map is
the one that bites: the old key stops applying silently, so a package's install scripts
are skipped until it is listed again.

## Working agreements

- **Don't commit or open PRs** — the repo owner does that. Leave changes in the working
  tree.
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
- **Don't edit this file unless explicitly asked.** Auditing it, reporting stale rules,
  or proposing wording is fine unprompted; writing the change is not. A rule lands here
  only when the repo owner says so.
- **Every untracked working file lives in `.claude/scratch/`** — review replies, design
  plans and pending-work lists, all in one ignored folder instead of scattered across the
  repo root. This file is the exception: `CLAUDE.md` stays at the root, the only project
  path Claude Code loads on its own.
- Keep code comments short — one line, and only for what the code cannot show itself.
- **Break a comment line after its punctuation.**
  A comment that runs past one line wraps at the sentence, not at the column:
  start the next line after the full stop, colon or dash that ends the thought,
  rather than filling to the print width.
  One thought per line, so a later edit touches one line in the diff.
- `.claude/scratch/CORE_DEFERRED_IMPROVEMENTS.md` lists the follow-ups `packages/core`
  still owes. Check it before starting work there — several items are unblocked now that
  the api layer is typed — and keep it current as they land.

## TypeScript conventions

The JSDoc-annotated `.js` → `.ts` migration is **done**: `packages/core` is `.ts`
throughout, source and tests alike, and `allowJs` is gone from its `tsconfig.json`. The
only `.js` left in the package is `scripts/generate-graphql-types.js`, which no config
includes. The rules below came out of that migration and still hold for new code.

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
hand the render functions typed values — defaults stay with the renderer.

**Each endpoint declares what it accepts as a `zod/mini` schema**, built from the shared
params in `api/params.ts` (`booleanParam`, `listParam`, `numberParam`, `looseIntParam`,
`rawParam`, `safeParam`, `safeListParam`, `localeParam`, `enumParam(values)`,
`yearParam`) — none of which takes a message, because the wording is derived from the
kind and the param name.
A handler is then three steps — `parseColorParams(query)`, `parseParams(xQuery, query)`,
render — wrapped in one `try`/`catch` whose `catch` is `errorResult(err, colors)`.
Parsing throws, fetching throws, and one place turns whatever was thrown into the answer.

- **Colors parse first, separately.**
  A rejected color cannot be used to draw its own error card, which is why
  `parseColorParams` is its own pass and its error renders with no `renderOptions`.
- **The query type comes from the schema.** Each handler declares
  `type XApiQuery = ApiQuery<typeof xQuery>` and takes it as its parameter — the alias
  stays module-local, since only that handler names it and knip flags an unused export.
  `ApiQuery` itself is what `params.ts` exports. A consumer is checked at the call site
  rather than by importing the alias: an unknown param or a non-string value is a
  compile error, and every param stays optional.
- **`enumParam` takes the card's own list.**
  `RANK_ICONS`, `TOP_LANG_LAYOUTS`, `WAKATIME_LAYOUTS`, `DISPLAY_FORMATS` and
  `TOP_LANG_STATS_FORMATS` are exported by the card that renders them, and the card's
  union type is derived from the same const, so the schema cannot drift from what renders.
  Each handler is a **named** export carrying its own lists, so a UI reads the accepted
  values off the function it calls: `topLangs.LAYOUTS`, `stats.RANK_ICONS`.
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
- **Match the coercion the callee already performed.** `border_radius` is `parseFloat`d by
  `numberParam` because `Card` did `parseFloat(String(border_radius))` internally, so
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
— where it used to sit, its only live effect was forcing declaration emit.

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

## The CLI

`packages/cli` is `@stats-forge/github-stats-forge-cli`, whose `bin` (`github-stats-forge`)
points at `./build/index.js`. Node 24 runs TypeScript directly but does **not** rewrite a
`./x.js` specifier to `.ts`, so `node src/index.ts` dies on its first relative import —
which is why `pnpm dev` is `pnpm run build && node build/index.js`.

- **Choices come from core's exports, never a copy.** `src/cards.ts` reads
  `stats.RANK_ICONS`, `topLangs.LAYOUTS`, `wakatime.DISPLAY_FORMATS` and
  `Object.keys(themes)`, so a prompt cannot offer a value the schema would reject. This is
  the reason the api handlers carry their lists as properties.
- **A saved card file is a query string in JSON**: `{ card, params }` with every param a
  string, so it reads like the URL it stands for and survives hand-editing. A param that
  is not a string is dropped on read, because it could not have come off a query string.
- **stdout carries the result; everything else goes to stderr** — the spinner, the error
  report, the status line. The spinner degrades to a single printed line when stderr is
  not a TTY.
- **The menu stays open after a render** and keeps the cursor where it was, because a card
  is rarely right the first time and the point of the option list is to change one thing
  and look again.

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
