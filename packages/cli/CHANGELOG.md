# @stats-forge/github-stats-forge-cli

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
