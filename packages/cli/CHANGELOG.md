# @stats-forge/github-stats-forge-cli

## 0.6.2

### Patch Changes

- [#171](https://github.com/stats-forge/github-stats-forge/pull/171) [`8d271e8`](https://github.com/stats-forge/github-stats-forge/commit/8d271e804941e0a4c462c6f36a9613a4b475d14c) - build: accept any compatible @inquirer release

  The six prompt packages were pinned exactly, so a patched release reached an install
  only after a release here. A caret lets one in at install time, as core's `zod` already does.

- [#130](https://github.com/stats-forge/github-stats-forge/pull/130) [`42951eb`](https://github.com/stats-forge/github-stats-forge/commit/42951eb5fa31f5d7bde215e93cedcbc263056724) - build: update @inquirer/checkbox to 5.2.5

- [#130](https://github.com/stats-forge/github-stats-forge/pull/130) [`42951eb`](https://github.com/stats-forge/github-stats-forge/commit/42951eb5fa31f5d7bde215e93cedcbc263056724) - build: update @inquirer/confirm to 6.3.2

- [#130](https://github.com/stats-forge/github-stats-forge/pull/130) [`42951eb`](https://github.com/stats-forge/github-stats-forge/commit/42951eb5fa31f5d7bde215e93cedcbc263056724) - build: update @inquirer/input to 5.1.6

- [#130](https://github.com/stats-forge/github-stats-forge/pull/130) [`42951eb`](https://github.com/stats-forge/github-stats-forge/commit/42951eb5fa31f5d7bde215e93cedcbc263056724) - build: update @inquirer/number to 4.2.3

- [#130](https://github.com/stats-forge/github-stats-forge/pull/130) [`42951eb`](https://github.com/stats-forge/github-stats-forge/commit/42951eb5fa31f5d7bde215e93cedcbc263056724) - build: update @inquirer/password to 5.2.2

- [#130](https://github.com/stats-forge/github-stats-forge/pull/130) [`42951eb`](https://github.com/stats-forge/github-stats-forge/commit/42951eb5fa31f5d7bde215e93cedcbc263056724) - build: update @inquirer/select to 5.2.5
- Updated dependencies [[`c056ec3`](https://github.com/stats-forge/github-stats-forge/commit/c056ec32b2bbc6983f07eb0111fbe52e98f5a61f), [`33daaa2`](https://github.com/stats-forge/github-stats-forge/commit/33daaa2482b8e7069c09d1f6e121797b8afd37fd)]:
  - @stats-forge/github-stats-forge-core@0.8.2

## 0.6.1

### Patch Changes

- [#150](https://github.com/stats-forge/github-stats-forge/pull/150) [`eb463cd`](https://github.com/stats-forge/github-stats-forge/commit/eb463cdbc0b72cd79404561342dea40b8a606ce5) - docs: cut each README to a front door and link the documentation site
- Updated dependencies [[`eb463cd`](https://github.com/stats-forge/github-stats-forge/commit/eb463cdbc0b72cd79404561342dea40b8a606ce5), [`9eefeaa`](https://github.com/stats-forge/github-stats-forge/commit/9eefeaaec3e9c6e68c94ccac117e13331c97a75d), [`a6cca30`](https://github.com/stats-forge/github-stats-forge/commit/a6cca30771fdcd57e701a3ea79981f8c5944120d), [`c16f58e`](https://github.com/stats-forge/github-stats-forge/commit/c16f58ef75b929ab9a190a38a05ef815bfe6e423)]:
  - @stats-forge/github-stats-forge-core@0.8.1
  - @stats-forge/github-stats-forge-catalog@0.1.1

## 0.6.0

### Minor Changes

- [#126](https://github.com/stats-forge/github-stats-forge/pull/126) [`f255874`](https://github.com/stats-forge/github-stats-forge/commit/f2558741b3b191c972715775cbfec07494966677) - feat!: move the card catalog to `@stats-forge/github-stats-forge-catalog`

  The `./cards` export is gone: `cards`, `findCard`, `COMMON_OPTIONS`, `OPTION_GROUPS`
  and `numericStep` come from that package now.
  Nothing about the prompts changes.

### Patch Changes

- Updated dependencies [[`f255874`](https://github.com/stats-forge/github-stats-forge/commit/f2558741b3b191c972715775cbfec07494966677)]:
  - @stats-forge/github-stats-forge-catalog@0.1.0

## 0.5.2

### Patch Changes

- Updated dependencies [[`30d12da`](https://github.com/stats-forge/github-stats-forge/commit/30d12da3d4c0de6b7e02d246a335ae81036e1839), [`1cfce65`](https://github.com/stats-forge/github-stats-forge/commit/1cfce655777e387bbbff8751f25cc23e1c26a5e5)]:
  - @stats-forge/github-stats-forge-core@0.8.0

## 0.5.1

### Patch Changes

- [#111](https://github.com/stats-forge/github-stats-forge/pull/111) [`b445f12`](https://github.com/stats-forge/github-stats-forge/commit/b445f12bd7f7c8c4bf1fb0aea1781e86419efd7e) - feat!: read and write the card's query string, and flatten the saved card file

  `--print-query` and a new `Print the query` action write the options as a query string, which is what the action's `options` input and a hosted card URL both take.
  `--options` reads the same form back — bare, with its `?`, or as a whole card URL — and layers over `--config`.

  A saved card no longer nests its options under `options`:
  every one sits beside `card`, which names the card they belong to, and a `version` says which shape of the file it is.

  Files written by earlier versions are not read. If you were relying on files just remove the options wrapper.

- Updated dependencies [[`218932a`](https://github.com/stats-forge/github-stats-forge/commit/218932ab922c6f41a337ca2ede926530ebbc968a)]:
  - @stats-forge/github-stats-forge-core@0.7.1

## 0.5.0

### Minor Changes

- [#106](https://github.com/stats-forge/github-stats-forge/pull/106) [`10ac5b6`](https://github.com/stats-forge/github-stats-forge/commit/10ac5b6a2b08e20446f2dd08f73325bd4a14f12a) - feat: add the organization activity card

  What an organization did over a window:
  pull requests opened and merged, issues opened and closed,
  and — behind `show` — discussions opened and commits authored.
  `days` sets the window, which ends today and defaults to 30.

### Patch Changes

- [#107](https://github.com/stats-forge/github-stats-forge/pull/107) [`68574ab`](https://github.com/stats-forge/github-stats-forge/commit/68574abf7f89d4f848b0fe648bf66d44aebcf35f) - docs: keep the GitHub token off the command line

  Every `docker run` example uses `--env-file` instead of `-e PAT_1=github_pat_...`,
  and self-hosting gained a "Where the token lives" section: env files, Compose,
  a secret manager and a KMS-backed Kubernetes Secret.

- Updated dependencies [[`c2bf350`](https://github.com/stats-forge/github-stats-forge/commit/c2bf350a566d83def0a9d1c25c79aeda7c9f6ea8), [`10ac5b6`](https://github.com/stats-forge/github-stats-forge/commit/10ac5b6a2b08e20446f2dd08f73325bd4a14f12a)]:
  - @stats-forge/github-stats-forge-core@0.7.0

## 0.4.1

### Patch Changes

- [#88](https://github.com/stats-forge/github-stats-forge/pull/88) [`7de50e4`](https://github.com/stats-forge/github-stats-forge/commit/7de50e4a989b84ec23663b7e86234aee9f44ae90) - build: depend on the inquirer prompts used, not on `@inquirer/prompts`

  The meta-package pulled all ten prompts, five of them never imported.
  Ten packages leave the install, and nothing about the prompts changes.

- [#89](https://github.com/stats-forge/github-stats-forge/pull/89) [`8157af8`](https://github.com/stats-forge/github-stats-forge/commit/8157af896ad1f19f0f5a6df7e780cef3a63bab64) - feat: ask a numeric option as a number, not as text

  The eighteen numeric options fell through to a text prompt,
  so anything typed reached the query string unchecked.
  A count refuses a fraction now, and a weight takes one.

## 0.4.0

### Minor Changes

- [#76](https://github.com/stats-forge/github-stats-forge/pull/76) [`971285c`](https://github.com/stats-forge/github-stats-forge/commit/971285c18637da70b136d976607c858bfbbf944e) - feat(cli): group the option menu into sections

  Every option now sits under a heading that says what it governs:
  what the card counts, what it shows, its text and size, its colors and border.
  Generate, save and quit carry a heading of their own above them.
  The list is as tall as the terminal, an unanswered option is dimmed,
  and typing jumps to a label — `g`, `s` and `q` reach the three actions from anywhere in it.

  `CardOption` carries its section as a required `group`;
  the params a card cannot render without are `CardField`, which has none.

### Patch Changes

- [#78](https://github.com/stats-forge/github-stats-forge/pull/78) [`0064e34`](https://github.com/stats-forge/github-stats-forge/commit/0064e3411d3e4cb6345d5b4efab94a202c051143) - fix: point the bin at a committed shim, so a clean install can link it

  `bin` named `build/index.js`, which does not exist until the package is built —
  so pnpm warned on every clean install of the workspace,
  once for each app that depends on the CLI, and created no bin link.
  It now names `bin.js`, three committed lines that import the built entry point.

- Updated dependencies [[`0ca9fe1`](https://github.com/stats-forge/github-stats-forge/commit/0ca9fe1b723313d233b2556c8c699b810e08c21d)]:
  - @stats-forge/github-stats-forge-core@0.6.0

## 0.3.2

### Patch Changes

- Updated dependencies [[`cdc67b5`](https://github.com/stats-forge/github-stats-forge/commit/cdc67b510419bb2bf364dfe63057d38c16c04e6c), [`a6bfe27`](https://github.com/stats-forge/github-stats-forge/commit/a6bfe27deebfe5ceaaf38e2d566a5cf2fa8016a7)]:
  - @stats-forge/github-stats-forge-core@0.5.0

## 0.3.1

### Patch Changes

- [#64](https://github.com/stats-forge/github-stats-forge/pull/64) [`e647e18`](https://github.com/stats-forge/github-stats-forge/commit/e647e18ac26fbbfc04823d1d01fa3b5419e3b3f1) - feat(cli): offer the organization card

  It asks for the organization's login, then the options that card takes.

- Updated dependencies [[`3116862`](https://github.com/stats-forge/github-stats-forge/commit/3116862292b652a16d665003009e2e3f3a9aea17), [`e647e18`](https://github.com/stats-forge/github-stats-forge/commit/e647e18ac26fbbfc04823d1d01fa3b5419e3b3f1), [`f9c9d38`](https://github.com/stats-forge/github-stats-forge/commit/f9c9d38a9eff1f8fa1ffc8786b4cc671eb71c4ae)]:
  - @stats-forge/github-stats-forge-core@0.4.0

## 0.3.0

### Minor Changes

- [#58](https://github.com/stats-forge/github-stats-forge/pull/58) [`5fa21c7`](https://github.com/stats-forge/github-stats-forge/commit/5fa21c777c5c95cf24173e6ccad01ffcb0114175) - feat(cli): export the card catalog

  `./cards` now exposes `cards`, `findCard` and `COMMON_OPTIONS`,
  so a second UI over the same options reads one list rather than keeping its own.
  The documentation site's card builder is the first to do it.

### Patch Changes

- Updated dependencies [[`5fa21c7`](https://github.com/stats-forge/github-stats-forge/commit/5fa21c777c5c95cf24173e6ccad01ffcb0114175)]:
  - @stats-forge/github-stats-forge-core@0.3.0

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

- Updated dependencies [[`05d7a7d`](https://github.com/stats-forge/github-stats-forge/commit/05d7a7deb9bd80ab8c95f046ca6b325d63590950), [`e4dfa0c`](https://github.com/stats-forge/github-stats-forge/commit/e4dfa0cbbad709b9034151c4dfb6c2570ec2d33b), [`3af493a`](https://github.com/stats-forge/github-stats-forge/commit/3af493a737a8b4ac901149b0a240b3d5e81a3ff8), [`e9c9eeb`](https://github.com/stats-forge/github-stats-forge/commit/e9c9eeb69d846b2db40b1dc2a4be653a6df8fed5), [`dc8ba26`](https://github.com/stats-forge/github-stats-forge/commit/dc8ba26207819cfe8bd2e2fb2cbec3d3332df8f3), [`bf6a552`](https://github.com/stats-forge/github-stats-forge/commit/bf6a552a76bc7d62c198529c379a5e071de32309)]:
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
