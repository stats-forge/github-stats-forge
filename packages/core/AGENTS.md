# packages/core

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

The library itself: `fetchers/` (network) → `cards/` (SVG render) → `api/` (query-string
handlers). The cards have rules of their own, in `src/cards/AGENTS.md`.

## The api layer is the trust boundary

`api/*` turns a query string into card options, so **parse and validate there once** and
hand the render functions typed values — defaults stay with the renderer.

**Each endpoint declares what it accepts as a `zod/mini` schema**, built from the shared
params in `api/params.ts` (`booleanParam`, `listParam`, `numberParam`, `looseIntParam`,
`rawParam`, `safeParam`, `safeListParam`, `localeParam`, `enumParam(values)`,
`fromParam`, `toParam`) — none of which takes a message, because the wording is derived
from the kind and the param name.
A handler is then `cardHandler(xQuery, identities, async (params, colors, config) => svg)` from `api/handler.ts`:
it parses the colors, parses the query against the schema, checks the allowlists, awaits the render,
and its two `catch`es are the only place `errorResult` is called.
Parsing throws, fetching throws, and one place turns whatever was thrown into the answer.
Six handlers each carried that control flow by hand until 2026-09-05.

- **The allowlists are enforced here, and a card declares which of its params they guard.**
  `cardHandler`'s second argument maps a param to `'username'` or `'gist'`, the check runs after
  parsing and **before the render**, and a refusal is `not_allowed` — so an identity a pinned
  deployment does not serve costs it no rate-limit point. Naming a param the schema does not
  declare is a compile error, and the map is carried on the handler as `IDENTITIES` the way
  `OPTIONS` is, which is what lets `tests/allowlist.test.ts` assert every card declares one.
  - **This existed as `CardConfig.isAllowed` and was called by nothing** from the day it was
    added until 2026-09-09 — parsed from `ALLOWLIST`, documented on the site and in the server's
    README, and enforced nowhere, so a deployment configured with it served anyone who asked.
    A config field that only a method reads, and a method nothing calls, is the shape of that
    bug; knip does not flag an unused class member.
  - **`ALLOWLIST` is every GitHub login**, a user's and an organization's alike, GitHub sharing
    one namespace between them — so the org card's `org` is guarded by the same list as
    `username`. Matched case-insensitively, because a login is.
  - **The wakatime card is deliberately unguarded**, its `username` being a WakaTime profile
    rather than a GitHub login; it declares `{}` with the reason written at the call site, and a
    test asserts the empty map so that turning it into an oversight takes an edit.
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
  `missing_param`, `not_allowed`, `not_found`, `no_tokens`, `rate_limited` and `upstream`;
  `retryable` is
  derived from the code by one table — `no_tokens` is retryable, its remedy being a token on the
  next start rather than a query change — so "can a retry help" is answered once rather than at
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
  `usernameParam`, so the five endpoints taking a GitHub login reject it as
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

## Generated GraphQL types

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

**A count GitHub can search for is an aliased `search` field, and a request carries as many as
it likes for one point.** Measured on 2026-09-12 while the organization activity card was
written: six searches plus an `organization` selection in one request answered `cost: 1`, and so
did two. So `org-activity.graphql` is a static operation asking for every figure it might draw,
rather than a document assembled per `show` — the shape of the card cannot change what it costs.
A search qualifier reads a **date**, not the `DateTime` the GraphQL arguments take, which is what
`toSearchDate` in `common/date.ts` is for.

- **Commits are the one figure that has no GraphQL search index.** `search(type: ISSUE)` covers
  issues and pull requests and `type: DISCUSSION` the discussions, but commits are REST only —
  a second request, against the search API's much smaller allowance. That is why the activity
  card's commit row is behind `show` and why `fetchOrgActivity` takes `include_commits`: the api
  handler derives it from `show`, so a card that does not draw the row never pays for it. A
  refused commit search leaves the count `null` and the rest of the card renders.

The generator (`packages/core/scripts/generate-graphql-types.ts`) is deliberately
dev-only — no codegen dependency reaches consumers. It is covered by
`packages/core/tsconfig.scripts.json`, so `pnpm typecheck` checks it like any other
source file. The repo-root `scripts/` is covered the same way, by `tsconfig.scripts.json`
at the root.

**`graphql` is held at 16 — 17 cannot generate these types.** v17 enforces that an
implementation field is not deprecated where the interface field it satisfies isn't, and
GitHub's published SDL breaks it on five fields across `TeamDiscussion` and
`TeamDiscussionComment`. The generator's `buildSchema(…, { assumeValidSDL: true })` does
not help: codegen runs `assertValidSchema` of its own inside `validateGraphQlDocuments`,
so `check-graphql-types` fails before writing anything. `@octokit/graphql-schema` also
depends on graphql `^16.0.0`, so 17 puts two copies in the lockfile for no gain. Tried and
reverted on 2026-09-13; retry only once GitHub's SDL is clean or octokit moves to 17.
