# @stats-forge/github-stats-server

## 0.6.0

### Minor Changes

- [#276](https://github.com/stats-forge/github-stats-forge/pull/276) [`3238d0a`](https://github.com/stats-forge/github-stats-forge/commit/3238d0a62ce9ea9fa9c42368338c79985bbbc806) - feat: answer with the last good card while a redraw fails

  It stands in for the error card for up to a day.

- [#278](https://github.com/stats-forge/github-stats-forge/pull/278) [`b4badf3`](https://github.com/stats-forge/github-stats-forge/commit/b4badf3c0596d1d60e29db1510f40bd03eb120d5) - feat: set how long the last good card covers a failing redraw, with `STALE_SECONDS`

  It defaults to a day; `0` turns the fallback off.

### Patch Changes

- [#273](https://github.com/stats-forge/github-stats-forge/pull/273) [`1264b6a`](https://github.com/stats-forge/github-stats-forge/commit/1264b6ae96bc3b2f9ae56cbc37d70f0c141abd61) - docs: list `forbidden` among the library's error codes

- [#269](https://github.com/stats-forge/github-stats-forge/pull/269) [`8a23daf`](https://github.com/stats-forge/github-stats-forge/commit/8a23daf3e805b1ed0c456267db262aa4bd918f01) - fix: report every token GitHub rejected as `no_tokens`, not a rate limit

  An expired or revoked token now asks to be replaced instead of to be waited out.

- [#277](https://github.com/stats-forge/github-stats-forge/pull/277) [`149603e`](https://github.com/stats-forge/github-stats-forge/commit/149603e58b95d9adca601857cccf9300218329a2) - docs: cut the self-hosting page down to what it needs
- Updated dependencies [[`2e48bfd`](https://github.com/stats-forge/github-stats-forge/commit/2e48bfd7d8056c7e6f9440c8e9c3e9f87ad5676e), [`27d572d`](https://github.com/stats-forge/github-stats-forge/commit/27d572df10b7a92ddc05ebd653cf6e9ca4ca9e2f), [`6de4809`](https://github.com/stats-forge/github-stats-forge/commit/6de4809d0ff10b8db279b228327fca606abf9664), [`52a093b`](https://github.com/stats-forge/github-stats-forge/commit/52a093b7e05f926593b432d8c671f974c235f160), [`c4f3f00`](https://github.com/stats-forge/github-stats-forge/commit/c4f3f007cc1e30e770828f4af7cca462baf8d482), [`002e2bc`](https://github.com/stats-forge/github-stats-forge/commit/002e2bce4e4b8fff8a2f62a6d327e45e1de620a5), [`8a23daf`](https://github.com/stats-forge/github-stats-forge/commit/8a23daf3e805b1ed0c456267db262aa4bd918f01), [`73db019`](https://github.com/stats-forge/github-stats-forge/commit/73db01923b9ded6c13fd422d5ff13c77dede1e21), [`de87c16`](https://github.com/stats-forge/github-stats-forge/commit/de87c16f5b83d1aabd1c435392bf59481548a0df), [`941efec`](https://github.com/stats-forge/github-stats-forge/commit/941efec1e355dd95fe27fca99f8a6443cf65d736)]:
  - @stats-forge/github-stats-forge-core@0.10.0

## 0.5.0

### Minor Changes

- [#240](https://github.com/stats-forge/github-stats-forge/pull/240) [`9510a7e`](https://github.com/stats-forge/github-stats-forge/commit/9510a7eaeb1729f854d30721134c8a3f49d4472d) - feat!: stricter, more consistent card params

  - A malformed or unknown value is an `invalid_param` instead of being ignored: booleans,
    `number_format`, theme names, whole numbers, and `show`, `hide` and `role` entries.
  - `show` and `hide` each take any stat the card draws; a stat in both is left out, and not
    fetched.
  - Fixed values match case-insensitively, and lists trim spaces and drop empty entries.
  - An empty boolean (`?hide_border`) is `true`; any other empty param is absent.
  - A param given twice is joined into one list, by the server and the anvil as by the CLI, through
    the new `queryOf` export.
  - A number is digits only, with an optional `px` on `card_width` and `border_radius`; widths,
    heights and counts must be at least 1.
  - WakaTime `api_domain` is a host and an optional port (1–65535); its `username` is one path segment.
  - `exclude_repo` takes `owner/name` or `name`, ignoring case, on every card.
  - Each api handler carries `PARAMS`, the kind and choices of every param it reads, and `COLOR_PARAM_KEYS`
    names the color params.
  - Renamed: `contribs_include_own_repos` → `include_own_repos`; `stats_format` and `display_format`
    → `value_format`, whose `percentages` is now `percent`.
  - Renamed stats: `contribs` → `contributed_to`, `all_time_contribs` → `contributed_to_all_time`,
    `prs_authored` → `prs_opened`, `issues_authored` → `issues_opened`, and org-activity's
    `discussions` → `discussions_started`.
  - Renamed: the top-languages and WakaTime cards' `hide` → `hide_langs`, so `hide` always names stats.
  - Renamed: `custom_title` → `title`, `role` → `affiliation`, `api_domain` → `wakatime_host`,
    `browser_rendering` → `wrap_description`.
  - `number_precision` reaches every card drawing stat rows, and the repo card's stars and forks follow
    `number_format`.
  - The org-activity card takes `from` and `to` like the other cards; `days` stays as the shorthand
    for the last N days, and naming both is an `invalid_param`.
  - Removed `wrap_description` (formerly `browser_rendering`): a description is always wrapped by the
    card, to `description_lines_count` lines.
  - Removed `line_height`: rows sit on each card's own spacing.
  - Removed `text_bold`: each card keeps its own value weight.
  - The stats card's `repo` and `owner` become one `scope` list of `owner/name` and `owner/*` entries;
    a bare name, more than ten entries, or a `scope` with nothing counted by search is an `invalid_param`,
    and each scoped line names its scope. `renderStatsCard` takes `scope` as an option, and reads the
    login off `StatsData`; `fetchStats` and `fetchRepoUserStats` take `scope` for `repo` and `owner`.

### Patch Changes

- Updated dependencies [[`9510a7e`](https://github.com/stats-forge/github-stats-forge/commit/9510a7eaeb1729f854d30721134c8a3f49d4472d)]:
  - @stats-forge/github-stats-forge-core@0.9.0

## 0.4.9

### Patch Changes

- [#223](https://github.com/stats-forge/github-stats-forge/pull/223) [`7fb5232`](https://github.com/stats-forge/github-stats-forge/commit/7fb5232117e2abdda4fc1e8e68bf05c1a2c6cc74) - docs: say what the allowlists leave open on a self-hosted instance

  `ALLOWLIST` does not reach the gist card, which answers to `GIST_ALLOWLIST` alone, and the
  self-hosting page now says so, with an example of both. It also no longer lists gists under
  `/api/pin`, which draws repositories only.

- [#225](https://github.com/stats-forge/github-stats-forge/pull/225) [`6bb56ad`](https://github.com/stats-forge/github-stats-forge/commit/6bb56ada50574d9483b8e14c0a395a0b7017fd29) - docs: draw the site's cards from a made-up account

  The anvil's mock data and the previews on every card page no longer come from real accounts.
  Both are drawn from one fictional user, organization, gist and WakaTime profile,
  with figures chosen to show off each option.

- Updated dependencies [[`734c926`](https://github.com/stats-forge/github-stats-forge/commit/734c926ae292b285e62bf5f372e2243c82957428)]:
  - @stats-forge/github-stats-forge-core@0.8.5

## 0.4.8

### Patch Changes

- [#220](https://github.com/stats-forge/github-stats-forge/pull/220) [`eaf187d`](https://github.com/stats-forge/github-stats-forge/commit/eaf187d21fd47b90a750d39eb23565cfb211b154) - docs: redesign the landing page

  The hero is centred, the cards section shows a gallery linking to each card's page, and the four
  ways to draw a card are panels, with the GitHub Action first.

- [#217](https://github.com/stats-forge/github-stats-forge/pull/217) [`514822f`](https://github.com/stats-forge/github-stats-forge/commit/514822f2c4b6280db41d887fe74d3ffb062666c9) - docs: pin the actions/setup-node example to v7.1.0

- [#209](https://github.com/stats-forge/github-stats-forge/pull/209) [`e8616fc`](https://github.com/stats-forge/github-stats-forge/commit/e8616fc0c35131a2086f1f645b2f9dd21136af48) - docs: pin the stats-forge/github-stats-forge-action example to v0.8.3
- Updated dependencies [[`e6c0c83`](https://github.com/stats-forge/github-stats-forge/commit/e6c0c831827453db3dac57e7d3008edb772eb203), [`9700951`](https://github.com/stats-forge/github-stats-forge/commit/97009515dbb147ad55c435b2525b599162815717)]:
  - @stats-forge/github-stats-forge-core@0.8.4

## 0.4.7

### Patch Changes

- [#191](https://github.com/stats-forge/github-stats-forge/pull/191) [`c6b11a7`](https://github.com/stats-forge/github-stats-forge/commit/c6b11a7c72768fef8131852bcc2e585dc536b26a) - feat: let the gist card's animation be turned off

  `disable_animations=true` stops the fade-in, as it already does on the other cards.
  The card animates by default, which is what it did before.

- [#192](https://github.com/stats-forge/github-stats-forge/pull/192) [`bd1aa86`](https://github.com/stats-forge/github-stats-forge/commit/bd1aa866027e81c6dfe7d35b64fcbd9cff501c61) - docs: stop counting the cards that take `locale`

  The page said seven and there are eight. Naming no number cannot go stale again.

- [#205](https://github.com/stats-forge/github-stats-forge/pull/205) [`5bcdc80`](https://github.com/stats-forge/github-stats-forge/commit/5bcdc801e7a6dcd2dfb6c3835bf687e4e400feba) - build: update the node:24-alpine base image digest

- [#183](https://github.com/stats-forge/github-stats-forge/pull/183) [`079b725`](https://github.com/stats-forge/github-stats-forge/commit/079b72517d3c867b53832b3627b39c71045564f0) - docs: pin the stats-forge/github-stats-forge-action example to v0.8.2

- [#189](https://github.com/stats-forge/github-stats-forge/pull/189) [`d88e40e`](https://github.com/stats-forge/github-stats-forge/commit/d88e40ee2c2fe5de24e5aa8b4df69d2769882e33) - feat: animate the repository pin card, and let disable_animations stop it

  The card was drawn without animation and nothing could change that. It now behaves like
  every other card: the fade-in plays by default, and `disable_animations=true` turns it off.

- Updated dependencies [[`c6b11a7`](https://github.com/stats-forge/github-stats-forge/commit/c6b11a7c72768fef8131852bcc2e585dc536b26a), [`3221247`](https://github.com/stats-forge/github-stats-forge/commit/322124755f4950ef0e9517f907e8f6bc89d3a7e8), [`d88e40e`](https://github.com/stats-forge/github-stats-forge/commit/d88e40ee2c2fe5de24e5aa8b4df69d2769882e33)]:
  - @stats-forge/github-stats-forge-core@0.8.3

## 0.4.6

### Patch Changes

- [#155](https://github.com/stats-forge/github-stats-forge/pull/155) [`dbc8c1e`](https://github.com/stats-forge/github-stats-forge/commit/dbc8c1e786032bdfd89d1e3d809a8d4c1ff6fae5) - docs: pin the stats-forge/github-stats-forge-action example to v0.8.1
- Updated dependencies [[`c056ec3`](https://github.com/stats-forge/github-stats-forge/commit/c056ec32b2bbc6983f07eb0111fbe52e98f5a61f), [`33daaa2`](https://github.com/stats-forge/github-stats-forge/commit/33daaa2482b8e7069c09d1f6e121797b8afd37fd)]:
  - @stats-forge/github-stats-forge-core@0.8.2

## 0.4.5

### Patch Changes

- [#150](https://github.com/stats-forge/github-stats-forge/pull/150) [`eb463cd`](https://github.com/stats-forge/github-stats-forge/commit/eb463cdbc0b72cd79404561342dea40b8a606ce5) - docs: list every card id the CLI's `--card` accepts

- [#149](https://github.com/stats-forge/github-stats-forge/pull/149) [`9eefeaa`](https://github.com/stats-forge/github-stats-forge/commit/9eefeaaec3e9c6e68c94ccac117e13331c97a75d) - docs: say what a request that never reaches GitHub costs
- Updated dependencies [[`eb463cd`](https://github.com/stats-forge/github-stats-forge/commit/eb463cdbc0b72cd79404561342dea40b8a606ce5), [`9eefeaa`](https://github.com/stats-forge/github-stats-forge/commit/9eefeaaec3e9c6e68c94ccac117e13331c97a75d), [`a6cca30`](https://github.com/stats-forge/github-stats-forge/commit/a6cca30771fdcd57e701a3ea79981f8c5944120d), [`c16f58e`](https://github.com/stats-forge/github-stats-forge/commit/c16f58ef75b929ab9a190a38a05ef815bfe6e423)]:
  - @stats-forge/github-stats-forge-core@0.8.1

## 0.4.4

### Patch Changes

- [#135](https://github.com/stats-forge/github-stats-forge/pull/135) [`e6cec1a`](https://github.com/stats-forge/github-stats-forge/commit/e6cec1afec914cc1109b2fce4d2740bc852389bd) - ci: name the image on the server's release

  A release now ends with the image reference that version publishes as, rather than leaving it to
  be inferred from the tag.

## 0.4.3

### Patch Changes

- [#133](https://github.com/stats-forge/github-stats-forge/pull/133) [`299b2ea`](https://github.com/stats-forge/github-stats-forge/commit/299b2ea058c6f2da7b60db8e6ea4f2320a8a2608) - ci: tag and release the server like any other package

  Each version now gets a git tag and a GitHub release carrying its changelog entry, and the image
  publishes off that release rather than off any push to `main` with no changesets left.
  The self-hosting page says which image tags that leaves you to pin to.

## 0.4.2

### Patch Changes

- [#117](https://github.com/stats-forge/github-stats-forge/pull/117) [`c2164b0`](https://github.com/stats-forge/github-stats-forge/commit/c2164b0571503c3bff2645faf2670ce3587d8857) - docs: pin the actions/setup-node example to v7.0.0

- [#120](https://github.com/stats-forge/github-stats-forge/pull/120) [`ccc3e35`](https://github.com/stats-forge/github-stats-forge/commit/ccc3e35b41660abcd015ca15688a784f61abce1d) - docs: say what `role` actually scopes on the stats card

  It filters the repository list behind the stars total alone, not every stat, and the
  stars it widens still count towards the rank even under `hide=stars`.

- [#114](https://github.com/stats-forge/github-stats-forge/pull/114) [`51cafd6`](https://github.com/stats-forge/github-stats-forge/commit/51cafd6f2d311ccc12327c5acff186a494f607ec) - docs: pin every workflow example by SHA

  The `uses:` lines on the CLI and README pages name the commit each release was cut
  from, the way the action's own README does, and Renovate now moves them.

- Updated dependencies [[`30d12da`](https://github.com/stats-forge/github-stats-forge/commit/30d12da3d4c0de6b7e02d246a335ae81036e1839), [`1cfce65`](https://github.com/stats-forge/github-stats-forge/commit/1cfce655777e387bbbff8751f25cc23e1c26a5e5)]:
  - @stats-forge/github-stats-forge-core@0.8.0

## 0.4.1

### Patch Changes

- [#113](https://github.com/stats-forge/github-stats-forge/pull/113) [`218932a`](https://github.com/stats-forge/github-stats-forge/commit/218932ab922c6f41a337ca2ede926530ebbc968a) - docs: say what token the two organization cards need

  Organization data is granted separately from personal data, so the token that draws a stats
  card is not automatically one that draws an organization card. Both pages now carry the
  grant each kind of token needs, rather than leaving it to be discovered from an error.

- Updated dependencies [[`218932a`](https://github.com/stats-forge/github-stats-forge/commit/218932ab922c6f41a337ca2ede926530ebbc968a)]:
  - @stats-forge/github-stats-forge-core@0.7.1

## 0.4.0

### Minor Changes

- [#106](https://github.com/stats-forge/github-stats-forge/pull/106) [`10ac5b6`](https://github.com/stats-forge/github-stats-forge/commit/10ac5b6a2b08e20446f2dd08f73325bd4a14f12a) - feat: add the organization activity card

  What an organization did over a window:
  pull requests opened and merged, issues opened and closed,
  and — behind `show` — discussions opened and commits authored.
  `days` sets the window, which ends today and defaults to 30.

- [#107](https://github.com/stats-forge/github-stats-forge/pull/107) [`68574ab`](https://github.com/stats-forge/github-stats-forge/commit/68574abf7f89d4f848b0fe648bf66d44aebcf35f) - docs: keep the GitHub token off the command line

  Every `docker run` example uses `--env-file` instead of `-e PAT_1=github_pat_...`,
  and self-hosting gained a "Where the token lives" section: env files, Compose,
  a secret manager and a KMS-backed Kubernetes Secret.

### Patch Changes

- [#105](https://github.com/stats-forge/github-stats-forge/pull/105) [`d2edb5c`](https://github.com/stats-forge/github-stats-forge/commit/d2edb5ce317ebb9bd38d369b8b2e31a4d2a186f0) - docs: group the cards by subject, and say where a page sits

  The sidebar and the overview page divide them the way the anvil's picker does:
  a user's, a repository's or gist's, then an organization's.
  A card page is titled with the card's own name,
  above a `Cards / User` trail taken from the sidebar.

- [#103](https://github.com/stats-forge/github-stats-forge/pull/103) [`329af1d`](https://github.com/stats-forge/github-stats-forge/commit/329af1d8ae6a435de4c70aa82183154f5d02df65) - docs(anvil): plainer wording in the backdrop and source tooltips

- [#105](https://github.com/stats-forge/github-stats-forge/pull/105) [`d2edb5c`](https://github.com/stats-forge/github-stats-forge/commit/d2edb5ce317ebb9bd38d369b8b2e31a4d2a186f0) - fix: reach the docs and the anvil from a phone

  The header's two links were hidden under 50rem,
  where a splash page has no sidebar and so no menu button —
  which left the anvil reachable from nowhere.
  They take a row of their own there now.

- Updated dependencies [[`c2bf350`](https://github.com/stats-forge/github-stats-forge/commit/c2bf350a566d83def0a9d1c25c79aeda7c9f6ea8), [`10ac5b6`](https://github.com/stats-forge/github-stats-forge/commit/10ac5b6a2b08e20446f2dd08f73325bd4a14f12a)]:
  - @stats-forge/github-stats-forge-core@0.7.0

## 0.3.0

### Minor Changes

- [#98](https://github.com/stats-forge/github-stats-forge/pull/98) [`9cba9c8`](https://github.com/stats-forge/github-stats-forge/commit/9cba9c88fe66ad079c296fe70a57eb83d98ccc96) - feat: show a recorded CLI session on the CLI page

  The page now opens with a screen capture of the card being built:
  the stats card open above the terminal,
  the menu picking a theme,
  and the card redrawn when it is generated.

  `.mp4` joins the static handler's content types,
  which answered an unknown extension `application/octet-stream` —
  and under `nosniff` the browser refuses that rather than mislabelling it.

## 0.2.1

### Patch Changes

- [#89](https://github.com/stats-forge/github-stats-forge/pull/89) [`8157af8`](https://github.com/stats-forge/github-stats-forge/commit/8157af896ad1f19f0f5a6df7e780cef3a63bab64) - fix: let the anvil's fractional options take a fraction

  Every numeric field carried an implicit step of `1`,
  so `border_radius`, `size_weight` and `count_weight` refused a typed `4.5`.

## 0.2.0

### Minor Changes

- [#86](https://github.com/stats-forge/github-stats-forge/pull/86) [`8d25c2c`](https://github.com/stats-forge/github-stats-forge/commit/8d25c2c8f686e13185998c522e9a2f3b327fbe18) - feat: report a late draw in the anvil, and stand the card on its own ground

  The image carries the documentation site, so the anvil it serves gains both of these.
  A draw that is taking a while now says so — which on an instance is every redraw
  that misses the cache and reaches GitHub.
  The preview's ground follows the background the card itself asks for,
  so a dark theme is judged against a dark page rather than against the site's own panel;
  a control says so and moves with it, holding still where the background names neither.

## 0.1.1

### Patch Changes

- [#83](https://github.com/stats-forge/github-stats-forge/pull/83) [`313047e`](https://github.com/stats-forge/github-stats-forge/commit/313047ebb9e0d5d475925bec46af67eee983f117) - ci: publish the image, which the release gate had been skipping

  `release.yml` read the changesets action's output as `hasChangesets`,
  where v2 names it `has-changesets`.

## 0.1.0

### Minor Changes

- [#79](https://github.com/stats-forge/github-stats-forge/pull/79) [`0ca9fe1`](https://github.com/stats-forge/github-stats-forge/commit/0ca9fe1b723313d233b2556c8c699b810e08c21d) - feat(server): serve the documentation, and an anvil that draws from the instance

  The image now carries the documentation site, built from the same commit,
  so an instance documents the version that is running rather than pointing at a copy.
  It is served from `SITE_DIR`, claimed after the cards so nothing can shadow one.

  The anvil at `/anvil/` draws from the instance itself:
  real cards, from its tokens and its allowlists,
  with the card's URL beside the saved file — the one thing a static build cannot know.
  A picker falls back to the recording, which is what an instance with no `PAT_1` still has.
  The page says which of the two is drawing, because only one of them keeps what you type
  in the browser.

  The site marks itself as self-hosted: an amber icon, a chip beside the title,
  a suffix on the tab and a banner on the landing page.

- [#79](https://github.com/stats-forge/github-stats-forge/pull/79) [`0ca9fe1`](https://github.com/stats-forge/github-stats-forge/commit/0ca9fe1b723313d233b2556c8c699b810e08c21d) - feat(server): answer 403 for an account a pinned instance does not serve

  `ALLOWLIST` and `GIST_ALLOWLIST` now do what the README said they did,
  core having started enforcing them.
  `STRICT_HTTP_STATUS` maps the new `not_allowed` code to `403`,
  and the README says plainly that the list does not cover the wakatime card
  and is not authentication.

- [#79](https://github.com/stats-forge/github-stats-forge/pull/79) [`0ca9fe1`](https://github.com/stats-forge/github-stats-forge/commit/0ca9fe1b723313d233b2556c8c699b810e08c21d) - feat(server): serve the cards over HTTP, in a container image

  An HTTP server over core's api handlers, and the image it ships in.
  One path per card, `200` with the drawn error card by default so a README shows the reason
  rather than a broken image, and the truth in `Card-Status` / `Card-Error-Code` headers —
  `STRICT_HTTP_STATUS=true` answers with real status codes instead.
  Caching is a three-row TTL table plus a copy the process holds,
  so a hot README costs one GitHub request per TTL rather than one per view.

  The image runs the TypeScript sources: no build step, nothing bundled,
  and what runs in the container is what is in the repository.
  It is published to GHCR by the same release that publishes to npm.

### Patch Changes

- Updated dependencies [[`0ca9fe1`](https://github.com/stats-forge/github-stats-forge/commit/0ca9fe1b723313d233b2556c8c699b810e08c21d)]:
  - @stats-forge/github-stats-forge-core@0.6.0
