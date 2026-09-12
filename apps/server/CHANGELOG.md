# @stats-forge/github-stats-server

## 0.3.1

### Patch Changes

- [#103](https://github.com/stats-forge/github-stats-forge/pull/103) [`329af1d`](https://github.com/stats-forge/github-stats-forge/commit/329af1d8ae6a435de4c70aa82183154f5d02df65) - docs(anvil): plainer wording in the backdrop and source tooltips

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
