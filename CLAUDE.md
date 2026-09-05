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

`github-stats-forge` — a pnpm monorepo holding the library that renders
GitHub stats as SVG cards. The server and the docs site that used to live here are
gone: consumers (the GitHub Action, any self-hosted endpoint) import the package.

| Path            | What it is                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `packages/core` | The library: fetchers, card renderers, themes, api handlers                                               |
| `packages/cli`  | `github-stats-forge`: prompts through a card's options, writes the SVG, saves and reloads a card's config |
| `scripts/`      | Repo-level tooling — `assert-deduped.ts`, via `tsconfig.scripts.json`                                     |
| `examples/`     | A saved card per file, rendered through the CLI by `generate.ts` into `previews/`                         |

`packages/core/src` is laid out as `fetchers/` (network) → `cards/` (SVG render) →
`api/` (query-string handlers), with `common/` for shared helpers, `themes/` for the
theme table and `graphql/` for query text and its generated types.

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
pnpm examples             # build, then redraw examples/previews (add a name for one)
pnpm check-all            # every check CI runs, cheapest first, in one command
```

`check-all` is the one to reach for before handing work over: it is `format:check`,
`lint`, `typecheck`, `lint:publish`, `check-graphql-types`, `lint:knip`, `lint:deps`
and `vitest --run`, ordered so the fastest failure surfaces first. It does not build
separately, because `typecheck` already does. Keep it in step with
`.github/workflows/ci.yml` — a check that runs in CI and not here is a check that fails
after the push instead of before it.

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
- **Break a line after its punctuation — but only where it has to break.**
  Fill to the print width first: a thought that fits on one line stays on one line.
  Where it does not fit, start the next line after the full stop, colon, dash or comma
  that ends the clause, never mid-sentence, so a later edit touches one line in the diff.
  This governs prose in markdown as much as comments in code: sentence-per-line was
  applied to `examples/README.md` on 2026-09-02 and corrected the same day —
  the rule is where a break lands, not that every sentence earns one.
  **Every file the repo writes prose into is in scope, a changeset and a commit message
  included** — a changeset summary written on 2026-09-03 wrapped mid-phrase and had to be
  rewrapped, and it lands verbatim in the published `CHANGELOG.md`. The existing
  changesets are the reference: each break falls on a comma, colon or full stop, and a
  long clause is allowed to run past the width rather than be split.
- **`examples/previews/README.md` lists the cards in the root README's order**, a variant
  after the card it varies — `CARD_ORDER` in `examples/generate.ts` holds it, so reordering
  the README's table means reordering that list too.
- **`examples/previews` is committed, so redraw it when a card's output changes.**
  `pnpm examples` renders every saved card in `examples/cards` through the built CLI;
  it needs `PAT_1` in a root `.env`, which is why CI cannot keep the previews current.
  The SVGs carry live stats and drift on their own — that is expected, and not a reason
  to regenerate them in an unrelated change.
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

- **`allowBuilds` holds only packages still in the graph.** It is down to `lefthook`;
  `@swc/core`, `unrs-resolver` and `esbuild` were removed as each left. Check with
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
CommonCardOptions {…}` (an interface, not `type &`) in its own file, **not exported** —
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
`@stats/source` condition.

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
so it picks up the root `.env` the way `pnpm examples` does.
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
  not reached. `t` still throws when the key itself is absent, and when it has no `en`.
- **A card whose text is translated takes `locale`,** in its options, in its handler's
  schema and in the CLI's option list for it. The three move together.
- **Interpolation lives in the locale table, not around it.** `statCardLocales` and
  `contributedToCardLocales` are functions taking the values their strings need, so a
  plural rule (`repository` / `repositories`) or a possessive is the locale's own business.
  Compose fragments in the card only where the repo already does — a parenthesised year,
  a `label: value` pair.
- **Prefer `label: value` to a preposition** when a card assembles a phrase from a
  translated word and its data. The accessibility rows read
  `owner/name: 12 contributions, years: 2023, 2024` rather than `… in 2023, 2024`,
  because a dangling `in` does not survive translation.
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
