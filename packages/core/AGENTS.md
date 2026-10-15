# packages/core

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

The library itself: `fetchers/` (network) → `cards/` (SVG render) → `api/` (query-string
handlers). The cards have rules of their own, in `src/cards/AGENTS.md`.

## The api layer is the trust boundary

`api/*` turns a query string into card options, so **parse and validate there once** and hand the
render functions typed values; defaults stay with the renderer.

- **Never hand-edit `src/graphql/generated/**`** — see [Generated GraphQL types](#generated-graphql-types).
- **The allowlists are enforced here, before the render** ([#79]). `cardHandler`'s second argument
  maps a param to `'username'` or `'gist'`; a refusal is `not_allowed` and costs no rate-limit
  point. Naming a param the schema lacks is a compile error, and the map rides on the handler as
  `IDENTITIES`, so `tests/allowlist.spec.ts` asserts every card declares one.
  - **A config field only a method reads, and a method nothing calls, is a security bug knip will
    not flag.** `CardConfig.isAllowed` existed, documented and parsed, and enforced nothing until
    [#79].
  - **`ALLOWLIST` is every GitHub login**, users' and organizations' alike, matched
    case-insensitively — so the org card's `org` is guarded by it too.
  - **The wakatime card is deliberately unguarded**: its `username` is a WakaTime profile. It
    declares `{}` with the reason at the call site, and a test asserts the empty map.
- **A shape check inside a fetcher is not validation** ([#31]). A GitHub login's shape lives in
  `usernameParam`, so every endpoint taking one rejects it before any request. A fetcher keeps
  its own guard, `./fetchers` being public, but tests the shared pattern rather than a copy.
- **The boundary is strict: a value outside what a param accepts is an error, never ignored**
  ([#229], [#230], [#231]). A silently ignored value reads as a bug in the card rather than in the
  URL. Booleans are `true` / `false`; an `enumParam` or `enumListParam` matches case-insensitively
  and yields the value as its set spells it. **Unknown params stay ignored**: a README appends
  `?v=2` to get past GitHub's image cache, and the server reads `cache_seconds` off the query.
- **An empty value is resolved once, by `resolveEmpty` in the handler, before any check.**
  `?flag` and `?flag=` arrive alike, so an empty boolean is `true` and any other empty param is
  absent; no helper handles `''` itself.
- **A malformed param is a permanent `invalid_param`, decided at the boundary.** A render-time guard
  would throw into the generic `catch`, which reports a retryable error. Name the param, never echo
  the value.
- **A number is digits and nothing else, bar an optional `px` on a length.** `intParam` and
  `numberParam` take a `min` (an integer defaults to 1) and a `px` flag; `parseFloat` alone read
  `1e3` as 1000 and `5abc` as 5, and a negative width drew a broken SVG.
- **The api parses; the card defaults.** A handler turns strings into typed values and stops; it
  never supplies a fallback the render function already owns (gist's default theme is
  `default_repocard`, which only the card knows).

### How an endpoint is built

- **Each endpoint is a `zod/mini` schema built from the helpers in `api/params.ts`, and
  `cardHandler(schema, identities, render)`** ([#48]). The handler parses colors, parses the query,
  checks the allowlists and renders; its two `catch`es are the only place `errorResult` is called.
- **A param more than one card takes goes in a shared fragment** ([#234]): `commonParams`,
  `titleParams`, `statRowParams`, spread after the schema's identity param.
- **Every param helper records its kind with `kinded()`, and the handler carries them as `PARAMS`**
  ([#235]). `cardHandler` throws at import on a param built without one; the catalog's test reads
  them.
- **Colors parse first, on their own**: a rejected color cannot draw its own error card.
- **The query type comes from the schema.** A consumer is checked at the call site — an unknown
  param or a non-string value is a compile error — rather than by importing a type.
- **A card's accepted values ride on its renderer, in one `OPTIONS` object keyed by the option's
  name** ([#46]). The handler spreads the card's `OPTIONS` and adds only what belongs to the fetcher
  (`role`); `enumParam(renderStatsCard.OPTIONS.rank_icon)` reads it back. A UI reads
  `stats.OPTIONS.rank_icon` off the function it calls.
- **A list whose values are a closed set is an `enumListParam`** ([#230]), and sits in `OPTIONS`.
  Each card's `show` checks run through a `shows()` helper typed against its own list.
- **`NUMBER_FORMATS` lives in `common/render.ts`**, beside the `numberFormat === 'long'` that reads it.
- **A theme param is an `enumParam` over the theme names.** `getCardColors` still resolves an
  unknown name to `themes.default` for a direct caller, and `isThemeName` is `Object.hasOwn`, not
  `in`, so `?theme=toString` cannot find `Object.prototype`'s ([#231]).
- **One wording per kind of rejection, in `REJECTION_MESSAGES`.** A check declares its kind through
  `rejects(kind, passes)`; the param name comes from the issue's path. Only the first rejection is
  reported: the error card has one line.
- **Write plain properties, not conditional spreads.** `CardOptions<T>` (`cards/options.ts`) is
  `Partial<T>` that also accepts an explicit `undefined`, so a parsed-or-`undefined` local passes
  straight through.

### Errors

- **Everything throws `CardError`** (`common/error.ts`): a `code`, the two lines the card draws, and
  the param at fault. `retryable` is derived from the code by one table, so "can a retry help" is
  answered once.
  - **`CardError.from(err)` wraps anything else as `upstream`, which is retryable** — a permanent
    failure has to throw a `CardError` to be reported as one.
- **`ApiResult` is a union, not a status string.** A host branches on `code` / `retryable` and never
  reads the SVG to learn what happened.

## Generated GraphQL types

**Never hand-edit `src/graphql/generated/**` — change the query and regenerate.** The folder is
committed and both oxlint and knip ignore it, so nothing else guards it.

- **Query text lives in `src/graphql/queries/*.graphql`, never inline in a fetcher.** Derive fetcher
  types from the generated ones (`RepoInfo` is `Omit<RepoInfoFragment, …>`), and name a sub-shape
  with a GraphQL `fragment` rather than a `NonNullable<…>` chain.
- **A query whose shape is only known at runtime still gets typed**: declare the selection set as a
  fragment no operation spreads, and build the query in a `build<X>Document(…)` module under
  `src/graphql/` (see `contributionsDocument.ts`). One request per account year was the alternative,
  at one rate-limit point each.
  - **Such a module repeats its fragment's text, and nothing checks the copy** — the generator emits
    fragment types, not text. Change both together.
- **A `contributionsCollection` names both ends of its range, and spans at most a year** ([#47]).
  GitHub defaults an omitted `to` to a year after `from`, and refuses a longer range;
  `common/date.ts` slices one range per calendar year and `aliasedRanges` sends them in one
  request. Say **range, never span**: `from` and `to`, both inclusive.
- **A count GitHub can search for is an aliased `search` field** ([#106]): any number of them cost
  one point together, so `org-activity.graphql` asks for every figure it might draw. A search
  qualifier takes a date, which is what `toSearchDate` is for.
- **A search whose result a permission can change must say what it matched** ([#113]). A token
  refused issues answers `is:issue` with pull requests, so each issue search asks for
  `nodes { __typename }` and checks it got an `Issue`.
- **A stat the query asked for and the token may not read is `CardError.forbidden`, not a missing
  row** ([#113]). Its second line names the permission and the option that drops the stat.
  - **The api layer decides whether the stat was asked for, and hands the fetcher one boolean**
    (`require_members`, `require_issues`, `include_commits`); a fetcher never reads `show` or `hide`.
  - **A stat drawn by default is asked for by default**: the issue rows fail unless `hide` names
    both; the `show`-gated members row fails only when `show` names it.
  - **Log the refusal once, not once per page.**
- **Commits have no GraphQL search index**: they are REST only, against a much smaller allowance, so
  the activity card's commit row is behind `show` and a refused commit search leaves the count `null`.
- **The generator is dev-only** — no codegen dependency reaches consumers — and
  `packages/core/tsconfig.scripts.json` typechecks it.
- **`graphql` is 17, and the generator builds GitHub's schema with `assumeValid: true`.** GitHub's
  SDL breaks a v17 deprecation rule, and `assumeValidSDL` alone does not reach codegen's own
  validation. The queries are still validated against the schema.
  - **The `pnpm-workspace.yaml` override keeps graphql 16 out of the lockfile**, for a
    `@octokit/graphql-schema` export nothing calls. Drop it when octokit moves to 17.

[#31]: https://github.com/stats-forge/github-stats-forge/pull/31
[#46]: https://github.com/stats-forge/github-stats-forge/pull/46
[#47]: https://github.com/stats-forge/github-stats-forge/pull/47
[#48]: https://github.com/stats-forge/github-stats-forge/pull/48
[#79]: https://github.com/stats-forge/github-stats-forge/pull/79
[#106]: https://github.com/stats-forge/github-stats-forge/pull/106
[#113]: https://github.com/stats-forge/github-stats-forge/pull/113
[#229]: https://github.com/stats-forge/github-stats-forge/pull/229
[#230]: https://github.com/stats-forge/github-stats-forge/pull/230
[#231]: https://github.com/stats-forge/github-stats-forge/pull/231
[#234]: https://github.com/stats-forge/github-stats-forge/pull/234
[#235]: https://github.com/stats-forge/github-stats-forge/pull/235
