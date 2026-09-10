# @stats-forge/github-stats-server

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
