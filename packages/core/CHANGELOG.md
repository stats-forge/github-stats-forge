# @stats-forge/github-stats-forge-core

## 0.2.0

### Minor Changes

- [#47](https://github.com/stats-forge/github-stats-forge/pull/47) [`3af493a`](https://github.com/stats-forge/github-stats-forge/commit/3af493a737a8b4ac901149b0a240b3d5e81a3ff8) - feat(core)!: count the `stats` and `contributedTo` cards within a date range

  `from` and `to` replace `commits_year`, and give the `contributedTo` card the same pair.
  Each accepts `2024`, `2024-03` or `2024-03-15` and covers the whole of what it names,
  so `from=2024` starts on the 1st of January and `to=2024` ends on the 31st of December.
  Either end may be left open;
  a date outside 2008 through this year, or a `from` after its `to`, is rejected.

  `commits_year` also counted a day too many:
  GitHub reads an omitted `to` as a year after `from`,
  so `?commits_year=2024` included the 1st of January 2025.

- [#46](https://github.com/stats-forge/github-stats-forge/pull/46) [`e9c9eeb`](https://github.com/stats-forge/github-stats-forge/commit/e9c9eeb69d846b2db40b1dc2a4be653a6df8fed5) - feat(core)!: gather each card's accepted option values into one `OPTIONS` object

  Every handler now carries `OPTIONS`, keyed by the query param each set governs:
  `stats.OPTIONS.rank_icon`, `topLangs.OPTIONS.layout`, `wakatime.OPTIONS.display_format`.
  This replaces the flat properties, so `stats.RANK_ICONS` becomes `stats.OPTIONS.rank_icon`,
  `topLangs.LAYOUTS` becomes `topLangs.OPTIONS.layout`,
  and `wakatime.DISPLAY_FORMATS` becomes `wakatime.OPTIONS.display_format`.

  It also covers the comma-separated params, which had no published list at all:
  `show`, `hide` and `role`, so a UI can offer their values the way it offers an enum's.
  The values live on the render function that draws them and the handler forwards them,
  so what renders, what validates and what a UI offers cannot drift apart.

- [#49](https://github.com/stats-forge/github-stats-forge/pull/49) [`dc8ba26`](https://github.com/stats-forge/github-stats-forge/commit/dc8ba26207819cfe8bd2e2fb2cbec3d3332df8f3) - feat(core): put every card's remaining English text through `I18n`

  The `contributedTo` and gist cards read their words from a locale table now
  and accept `locale`, as do the stats card's `Rank` label
  and the repo card's missing description and unspecified language.

  `I18n#t` falls back to the English string when a locale has no entry for a key,
  so a key can be written in English and translated later —
  before, such a key threw and failed the whole card.

- [#44](https://github.com/stats-forge/github-stats-forge/pull/44) [`bf6a552`](https://github.com/stats-forge/github-stats-forge/commit/bf6a552a76bc7d62c198529c379a5e071de32309) - feat(core): add the `contributedTo` card

  The repositories a user has contributed to, all-time, ranked, with a mark per
  contribution year showing which ones each repository got. It reuses the walk `stats`
  already runs for `all_time_contributed_to`, so it costs no extra request.

  `contributions` counts commit-days, not commits: GitHub groups commit contributions by
  day.

### Patch Changes

- [#48](https://github.com/stats-forge/github-stats-forge/pull/48) [`05d7a7d`](https://github.com/stats-forge/github-stats-forge/commit/05d7a7deb9bd80ab8c95f046ca6b325d63590950) - refactor(core): share one handler shape across the api endpoints

  Every endpoint is now `cardHandler(schema, render)`,
  so the color pass, the query parse and the error card are written once rather than in each handler.
  The fetchers classify a GraphQL `NOT_FOUND` through the same helper,
  `clampValue` and `buildSearchFilter` take the typed values their callers already pass,
  and `measureText` no longer rebuilds its width table on every call.

## 0.1.0

### Minor Changes

- [#30](https://github.com/stats-forge/github-stats-forge/pull/30) [`91950e3`](https://github.com/stats-forge/github-stats-forge/commit/91950e3aecb7a335b730b768ba82c37e12dff313) - refactor(core)!: build cards from a node model instead of template literals

  A card is assembled as a tree, then serialized once at the end:
  `el(tag, attributes, ...children)` for elements, `rule` and `atRule` for the stylesheet.
  Nothing in the package concatenates markup any more.

  An attribute or child that resolves to `undefined` is simply not written.
  That removes what the template literals used to leave behind: blank lines, stray indentation,
  and gaps where an attribute was omitted. Cards come out one element per line,
  two spaces per nesting level.

  Three things a consumer may notice. A `<g>` carrying only `transform="translate(0, 0)"` is gone,
  as is the one `flexLayout` wrapped around a lone item:
  reaching into the SVG by structure rather than by `data-testid` may need adjusting.
  Text is escaped by the serializer,
  so a literal `&[#38](https://github.com/stats-forge/github-stats-forge/issues/38);` in a description now renders as `&[#38](https://github.com/stats-forge/github-stats-forge/issues/38);` rather than `&`.
  And rendering costs 1.5x to 2.6x what string concatenation did, 12-18us per card,
  which sits behind a GitHub API call either way.

- [#32](https://github.com/stats-forge/github-stats-forge/pull/32) [`5a959a2`](https://github.com/stats-forge/github-stats-forge/commit/5a959a2db3b8251fde8ad793a6989d7cfb3b8abe) - feat(core)!: generate the emoji map from GitHub's own shortcodes

  `emoji-name-map` is gone,
  replaced by a table generated from `emojibase-data` that matches GitHub's own list exactly.
  649 more shortcodes resolve, every country flag among them,
  and 158 gain the presentation selector they were missing: `:coffee:` is `☕️`, not `☕`.
  `:+1:` and `:-1:` render for the first time.

- [#15](https://github.com/stats-forge/github-stats-forge/pull/15) [`c3e8731`](https://github.com/stats-forge/github-stats-forge/commit/c3e8731d4d5fbffd004886ae8713cabf25f217be) - refactor(core)!: remove the package root entry point

  `@stats-forge/github-stats-forge-core` no longer resolves —
  every export it carried was already reachable from a subpath, so the subpath is now the only way in:

  - `stats`, `pin`, `topLangs`, `gist`, `wakatime`, `CardConfig`, `PersonalAccessToken`, `FetchLike`,
    `ApiResult`, `ApiError`, `themes`, `ThemeName` → `@stats-forge/github-stats-forge-core/api`
  - `fetchWakatimeStats`, `retryer` → `@stats-forge/github-stats-forge-core/fetchers`

- [#15](https://github.com/stats-forge/github-stats-forge/pull/15) [`c3e8731`](https://github.com/stats-forge/github-stats-forge/commit/c3e8731d4d5fbffd004886ae8713cabf25f217be) - refactor(core)!: remove the `/cards` entry point

  `@stats-forge/github-stats-forge-core/cards` no longer resolves. Nothing consumed it —
  the api handlers render internally, and a host that wants a card asks the handler for one.

  The card data shapes it re-exported — `GistData`, `Lang`, `RepositoryData`, `StatsData`,
  `TopLangData`, `WakaTimeData` —
  are still available from `@stats-forge/github-stats-forge-core/fetchers`,
  and each card's accepted values still ride on its handler (`stats.RANK_ICONS`, `topLangs.LAYOUTS`,
  `wakatime.DISPLAY_FORMATS`). The render functions themselves, `renderError`,
  and the `CardOptions` / `CommonCardOptions` types are now internal.

- [#29](https://github.com/stats-forge/github-stats-forge/pull/29) [`6e2958e`](https://github.com/stats-forge/github-stats-forge/commit/6e2958e723ba56c4b7a40dce5fc6eaa376edd32f) - feat(core)!: modernize card style

  - The default `border_radius` is `8`, up from `4.5`.
  - A theme that names no `border_color` derives one from its own background,
    so a dark card no longer gets the light `#e4e2e2` hairline.
    A color from the theme or the query wins.
  - Animations honour `prefers-reduced-motion: reduce`, and the stat rows arrive sooner.

  `border_radius=4.5` and `border_color=e4e2e2` bring the old style back.

- [#17](https://github.com/stats-forge/github-stats-forge/pull/17) [`e08dbc7`](https://github.com/stats-forge/github-stats-forge/commit/e08dbc76e120a8c4c69c2cd6675316e9887d6860) - chore!: narrow the supported Node range to `^24 || >=26`

  `engines.node` was `>=24`, so Node 25 no longer qualifies.
  It is an odd-numbered line that never reaches LTS,
  and dropping it keeps the supported set to the two versions CI runs.

  Runtime dependencies move too: `zod` to `^4.5.4` in core,
  and `@inquirer/prompts` to `8.7.0` in the CLI.

### Patch Changes

- [#27](https://github.com/stats-forge/github-stats-forge/pull/27) [`bfe4d1e`](https://github.com/stats-forge/github-stats-forge/commit/bfe4d1ee32d253fac00d1fe5038b9955e41ebdbc) - feat(core): update language colors

  Regenerated from the [upstream linguist languages file](https://github.com/github/linguist/blob/master/lib/linguist/languages.yml).

- [#33](https://github.com/stats-forge/github-stats-forge/pull/33) [`d38ebdd`](https://github.com/stats-forge/github-stats-forge/commit/d38ebdd63c0f125d8d4578b41a777577dbedf238) - fix(core): count the repositories a language appears in correctly

  `fetchTopLanguages` accumulated `count` in one variable shared by every language,
  so a repeat only counted correctly while a language's repositories arrived together. Interleaved —
  HTML, javascript, HTML, javascript —
  the second HTML read the counter javascript had just left behind,
  and reported 3 repositories instead of 2.
  Each language's count and size now come off that language's own entry,
  which makes the result independent of the order the repositories are visited in.

  `count_weight` multiplies this figure into the size a card sorts and draws by,
  and it defaults to 0 — so a default card is unchanged,
  and only one passing `count_weight` can reorder.

  Ported from upstream `github-stats-extended` 92e0185d ([#546](https://github.com/stats-forge/github-stats-forge/issues/546)), which fixes [#544](https://github.com/stats-forge/github-stats-forge/issues/544).

- [#31](https://github.com/stats-forge/github-stats-forge/pull/31) [`a9b179d`](https://github.com/stats-forge/github-stats-forge/commit/a9b179d6fda0bbb5a34353d70083f4e15c4af5f7) - fix(core): reject malformed GitHub usernames at the api boundary

  `username` was only checked against the safe character set,
  so a login GitHub could never issue still reached the fetchers: `-user`, `a--b`,
  anything longer than 39 characters.
  The stats, top-languages and pin endpoints now check its shape through `usernameParam`,
  which rejects it as `invalid_param` before any request is made.

  Drops the `github-username-regex` dependency and its `declare module` shim:
  the package's whole contents were the one regex literal now in `common/constants.ts`,
  shared with the guard in `totalItemsFetcher`.

- [#42](https://github.com/stats-forge/github-stats-forge/pull/42) [`198c552`](https://github.com/stats-forge/github-stats-forge/commit/198c55280083d8ed9090b879048ca24407db8ad0) - refactor: import relative modules with their real `.ts` extension

  A relative specifier now names the file that exists, and `tsc` rewrites it to `.js` on emit,
  so the published JavaScript is unchanged. The declarations keep the `.ts` specifier,
  which TypeScript resolves to the sibling `.d.ts`; `attw` and `publint` check it on every CI run.

- [#34](https://github.com/stats-forge/github-stats-forge/pull/34) [`4c1f8ac`](https://github.com/stats-forge/github-stats-forge/commit/4c1f8acc50df08ca982481d166aff4b20357f498) - refactor(core): break the `fmt` ↔ `render` import cycle

  `wrapTextMultiline` wraps text through `splitWrappedText`,
  so it belongs next to it in `common/render.ts` rather than in `common/fmt.ts`.
  `fmt.ts` now imports nothing and `render.ts` keeps its one-way import of `kFormatter`.
  Both modules are internal, so nothing a consumer imports has moved.

## 0.0.2

### Patch Changes

- [`b04612a`](https://github.com/stats-forge/github-stats-forge/commit/b04612ac2c951bbaf82d446bf1826d58f63e27fb) - ci: publish with npm trusted publishing (OIDC)

  Releases mint their npm credentials from the workflow's OIDC token, so they carry
  provenance and there is no publish token to rotate. Neither package's API changes.
