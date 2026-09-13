# @stats-forge/github-stats-server

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
