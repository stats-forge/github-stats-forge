# packages/core

> Scoped to this tree; the repo-wide rules are in the root `AGENTS.md`.

The cards have rules of their own, in `src/cards/AGENTS.md`.

## The api layer is the trust boundary

`api/*` turns a query string into typed card options: **parse and validate there once**, and leave
every default to the renderer (gist's default theme is `default_repocard`, which only the card knows).

- **The allowlists are enforced here, before the render** ([#79]). `cardHandler`'s second argument
  maps a param to `'username'` or `'gist'`; a refusal is `not_allowed` and costs no rate-limit
  point. Naming a param the schema lacks is a compile error. The map rides on the handler as
  `IDENTITIES`, and `tests/allowlist.spec.ts` asserts every card declares one.
  - **A config field only an uncalled method reads is a security bug knip won't flag**:
    `CardConfig.isAllowed` enforced nothing until [#79].
  - **`ALLOWLIST` holds every GitHub login, users' and organizations', matched case-insensitively**,
    so it guards `org` too.
  - **WakaTime is deliberately unguarded**, its `username` being a WakaTime profile: it declares `{}`,
    with the reason at the call site and a test on the empty map.
- **A fetcher's shape check is not validation** ([#31]). `usernameParam` rejects a bad login before
  any request; a fetcher keeps its own guard (`./fetchers` is public) built on the shared pattern.
- **A value outside what a param accepts is an error, never ignored** ([#229], [#230], [#231]).
  Booleans are `true`, `1` or `on` and `false`, `0` or `off`, in any case; an `enumParam` or
  `enumListParam` matches case-insensitively and yields its set's spelling. **Unknown params stay
  ignored**: a README appends `?v=2`, and the server reads `cache_seconds`.
- **`resolveEmpty` resolves an empty value once, in the handler**: an empty boolean is `true`, any
  other empty param absent. No helper handles `''` itself.
- **A malformed param is a permanent `invalid_param`, raised at the boundary**: a render-time throw
  reports a retryable error. Name the param, never echo the value.
- **A number is digits only, plus an optional `px` on a length.** `intParam` and `numberParam` take
  a `min` (an integer's defaults to 1) and a `px` flag; `parseFloat` read `1e3` as 1000 and `5abc`
  as 5, and a negative width drew a broken SVG.

### How an endpoint is built

- **A `zod/mini` schema built from `api/params.ts`, passed to `cardHandler(schema, identities, render)`**
  ([#48]), which parses colors, then the query, checks the allowlists and renders. Its two `catch`es
  are the only callers of `errorResult`.
- **Colors parse first**: a rejected color cannot draw its own error card.
- **A param several cards take goes in a shared fragment** ([#234]) (`commonParams`, `titleParams`,
  `statRowParams`), spread after the identity param.
- **Every param helper records its kind with `kinded()`, and the handler carries them as `PARAMS`**
  ([#235]), throwing at import on one without. The catalog's test reads them.
- **The query type comes from the schema**, so a consumer is checked at its call site.
- **A card's accepted values ride on its renderer as `OPTIONS`, keyed by option name** ([#46]). The
  handler spreads them, adds only the fetcher's own (`affiliation`), and reads them back, as in
  `enumParam(renderStatsCard.OPTIONS.rank_icon)`; a UI reads `stats.OPTIONS.rank_icon` off the
  function it calls.
- **A closed-set list is an `enumListParam` in `OPTIONS`** ([#230]). `show` and `hide` accept every
  stat the card draws, and the handler fetches only what is drawn; the second argument is what a
  form offers. Each card checks `show` through a `shows()` typed to its own list.
- **`NUMBER_FORMATS` lives in `common/render.ts`**, beside its one reader.
- **A theme param is an `enumParam` over the theme names.** `getCardColors` still maps an unknown
  name to `themes.default`; `isThemeName` is `Object.hasOwn`, so `?theme=toString` misses ([#231]).
- **Each kind of rejection has one wording, in `REJECTION_MESSAGES`**, declared through
  `rejects(kind, passes)`; the param name comes from the issue's path. Only the first is reported.
- **Write plain properties, not conditional spreads**: `CardOptions<T>` takes an explicit `undefined`.

### Errors

- **Everything throws `CardError`** (`common/error.ts`): a `code`, the card's two lines and the param
  at fault, with `retryable` derived from the code by one table. `CardError.from(err)` wraps anything
  else as a retryable `upstream`, so a permanent failure must throw a `CardError`.
- **Every failure lives in the module-level `FAILURES`, unexported.** Not a `static #` field: the
  types derive from it, a `#` field's type cannot be queried, and a TS-`private` one emits untyped.
  - **An entry is a function from its data to a `Failure`**; its parameter is what the reason needs,
    and `because` takes exactly that, so a missing value fails `tsc`. Pass in only what the table
    cannot word itself.
  - **`FailureReason` derives from `CardError.because`**, never written out.
  - **A reason one card family throws carries its prefix** (`gist_`, `org_`, `org_activity_`,
    `repo_`, `stats_`, `wakatime_`); a shared one keeps a plain name.
- **Throw by reason, `CardError.because(reason, …data)`, and test on `reason`, not text.** The
  constructor is `private`; `from` and `fromGraphQL` are the only other builders.
- **Each failure declares `reportable`**, which decides the error card's report line: off for a
  spent rate limit, upstream's outage, a missing param (whose card links the docs) and whatever
  `from` wraps.
- **`ApiResult` is a union**: a host branches on `code` and `retryable`, never on the SVG.

## Generated GraphQL types

**Never hand-edit `src/graphql/generated/**`**: oxlint and knip ignore it, so nothing else guards it.

- **Query text lives in `src/graphql/queries/*.graphql`**, never inline. Derive fetcher types from
  the generated ones, and name a sub-shape with a `fragment`, not a `NonNullable<…>` chain.
- **A query shaped at runtime is still typed**: declare its selection as a fragment nothing spreads,
  and build the document in a `src/graphql/build<X>Document(…)` module (see `contributionsDocument.ts`).
  Nothing checks the module's copy of the fragment text, so change both together.
- **A `contributionsCollection` names both ends and spans at most a year** ([#47]): `common/date.ts`
  slices one range per calendar year and `aliasedRanges` sends them in one request. Say **range**,
  never span; `from` and `to` are inclusive.
- **A searchable count is an aliased `search` field** ([#106]): any number cost one point together.
  `toSearchDate` formats a qualifier's date.
- **A search a permission can change says what it matched** ([#113]): a token refused issues answers
  `is:issue` with pull requests, so each issue search asks for `nodes { __typename }` and checks it
  got an `Issue`.
- **A stat asked for and refused is a `forbidden` reason, not a missing row** ([#113]); its second
  line names the permission and the option that drops the stat.
  - **The api layer decides whether it was asked for** and hands the fetcher one boolean
    (`require_members`, `require_issues`, `include_commits`); a fetcher never reads `show` or `hide`.
  - **A stat drawn by default is asked for by default**: the issue rows fail unless `hide` names
    both; the members row only when `show` names it. Log the refusal once, not per page.
- **Commits are REST only, against a smaller allowance**: the activity card's commit row is behind
  `show`, and a refused search leaves it `null`.
- **The generator is dev-only**, typechecked by `packages/core/tsconfig.scripts.json`.
- **`graphql` is 17, and GitHub's schema is built with `assumeValid: true`**: its SDL breaks a v17
  deprecation rule that `assumeValidSDL` alone doesn't skip. The queries are still validated.
  A `pnpm-workspace.yaml` override keeps graphql 16 out, for an `@octokit/graphql-schema` export
  nothing calls; drop it when octokit moves to 17.

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
