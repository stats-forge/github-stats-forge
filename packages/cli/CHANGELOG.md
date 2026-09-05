# @stats-forge/github-stats-forge-cli

## 0.2.0

### Minor Changes

- [#46](https://github.com/stats-forge/github-stats-forge/pull/46) [`e9c9eeb`](https://github.com/stats-forge/github-stats-forge/commit/e9c9eeb69d846b2db40b1dc2a4be653a6df8fed5) - feat(cli): pick a comma-separated list from checkboxes

  `show`, `hide` and `role` name a closed set of values,
  so they are now a checkbox prompt rather than a line to type commas into:
  nothing has to be remembered or spelled right.
  The lists whose values are a repository or a language have no such set and stay free text.

  Every prompt's choices now come from core's `OPTIONS`, including `number_format`,
  which the catalog had spelled out itself in two places.

### Patch Changes

- [#49](https://github.com/stats-forge/github-stats-forge/pull/49) [`dc8ba26`](https://github.com/stats-forge/github-stats-forge/commit/dc8ba26207819cfe8bd2e2fb2cbec3d3332df8f3) - feat(cli): offer the locale prompt on the gist and contributed-to cards

  Both cards draw translated text now, so both take a locale.

- Updated dependencies [[`05d7a7d`](https://github.com/stats-forge/github-stats-forge/commit/05d7a7deb9bd80ab8c95f046ca6b325d63590950), [`3af493a`](https://github.com/stats-forge/github-stats-forge/commit/3af493a737a8b4ac901149b0a240b3d5e81a3ff8), [`e9c9eeb`](https://github.com/stats-forge/github-stats-forge/commit/e9c9eeb69d846b2db40b1dc2a4be653a6df8fed5), [`dc8ba26`](https://github.com/stats-forge/github-stats-forge/commit/dc8ba26207819cfe8bd2e2fb2cbec3d3332df8f3), [`bf6a552`](https://github.com/stats-forge/github-stats-forge/commit/bf6a552a76bc7d62c198529c379a5e071de32309)]:
  - @stats-forge/github-stats-forge-core@0.2.0

## 0.1.0

### Minor Changes

- [#28](https://github.com/stats-forge/github-stats-forge/pull/28) [`0b7bd8b`](https://github.com/stats-forge/github-stats-forge/commit/0b7bd8b7a1808502c9b02d853adf91b887e071dc) - feat(cli)!: rename a saved card's `params` to `options`

  A saved card is `{ card, options }` now,
  matching what the menu calls them and what a render function takes:

  ```json
  {
    "card": "stats",
    "options": {
      "username": "anuraghazra",
      "theme": "tokyonight"
    }
  }
  ```

  A file written by an earlier version still loads its card, but its `params` are ignored —
  rename the key to keep them.

- [#17](https://github.com/stats-forge/github-stats-forge/pull/17) [`e08dbc7`](https://github.com/stats-forge/github-stats-forge/commit/e08dbc76e120a8c4c69c2cd6675316e9887d6860) - chore!: narrow the supported Node range to `^24 || >=26`

  `engines.node` was `>=24`, so Node 25 no longer qualifies.
  It is an odd-numbered line that never reaches LTS,
  and dropping it keeps the supported set to the two versions CI runs.

  Runtime dependencies move too: `zod` to `^4.5.4` in core,
  and `@inquirer/prompts` to `8.7.0` in the CLI.

### Patch Changes

- [#42](https://github.com/stats-forge/github-stats-forge/pull/42) [`198c552`](https://github.com/stats-forge/github-stats-forge/commit/198c55280083d8ed9090b879048ca24407db8ad0) - refactor: import relative modules with their real `.ts` extension

  A relative specifier now names the file that exists, and `tsc` rewrites it to `.js` on emit,
  so the published JavaScript is unchanged. The declarations keep the `.ts` specifier,
  which TypeScript resolves to the sibling `.d.ts`; `attw` and `publint` check it on every CI run.

- Updated dependencies [[`91950e3`](https://github.com/stats-forge/github-stats-forge/commit/91950e3aecb7a335b730b768ba82c37e12dff313), [`5a959a2`](https://github.com/stats-forge/github-stats-forge/commit/5a959a2db3b8251fde8ad793a6989d7cfb3b8abe), [`bfe4d1e`](https://github.com/stats-forge/github-stats-forge/commit/bfe4d1ee32d253fac00d1fe5038b9955e41ebdbc), [`d38ebdd`](https://github.com/stats-forge/github-stats-forge/commit/d38ebdd63c0f125d8d4578b41a777577dbedf238), [`c3e8731`](https://github.com/stats-forge/github-stats-forge/commit/c3e8731d4d5fbffd004886ae8713cabf25f217be), [`a9b179d`](https://github.com/stats-forge/github-stats-forge/commit/a9b179d6fda0bbb5a34353d70083f4e15c4af5f7), [`c3e8731`](https://github.com/stats-forge/github-stats-forge/commit/c3e8731d4d5fbffd004886ae8713cabf25f217be), [`6e2958e`](https://github.com/stats-forge/github-stats-forge/commit/6e2958e723ba56c4b7a40dce5fc6eaa376edd32f), [`e08dbc7`](https://github.com/stats-forge/github-stats-forge/commit/e08dbc76e120a8c4c69c2cd6675316e9887d6860), [`198c552`](https://github.com/stats-forge/github-stats-forge/commit/198c55280083d8ed9090b879048ca24407db8ad0), [`4c1f8ac`](https://github.com/stats-forge/github-stats-forge/commit/4c1f8acc50df08ca982481d166aff4b20357f498)]:
  - @stats-forge/github-stats-forge-core@0.1.0

## 0.0.2

### Patch Changes

- [`b04612a`](https://github.com/stats-forge/github-stats-forge/commit/b04612ac2c951bbaf82d446bf1826d58f63e27fb) - ci: publish with npm trusted publishing (OIDC)

  Releases mint their npm credentials from the workflow's OIDC token, so they carry
  provenance and there is no publish token to rotate. Neither package's API changes.

- Updated dependencies [[`b04612a`](https://github.com/stats-forge/github-stats-forge/commit/b04612ac2c951bbaf82d446bf1826d58f63e27fb)]:
  - @stats-forge/github-stats-forge-core@0.0.2
