# The CLI

> Scoped to this tree; the repo-wide rules are in the root `AGENTS.md`.

`@stats-forge/github-stats-forge-cli`, whose `bin` is `./bin.js`. `pnpm dev` runs
`node --conditions=@stats/source src/index.ts` with no build: Node strips the types, and the
condition reaches core's source through a symlink outside `node_modules`. `pnpm cli` at the root
builds and runs it against the root `.env`.

## Rules

- **`bin.js` is the one committed `.js` file** ([#78]): pnpm links a bin before anything is built, and
  Node won't strip types under a consumer's `node_modules`.
- **stdout carries the result; everything else goes to stderr.** The spinner prints one line when
  stderr is not a TTY.
- **Printing renders nothing, so it needs no token and no terminal** ([#111]); both guards in `main`
  must let `--print-query` through.
- **The query string is the interchange format** ([#111]): `--print-query` and Print write it;
  `--options`, the action's `options`, a card URL and the anvil read it. `toQueryString` writes the
  `?`; `fromQueryString` takes one or none, or a whole URL. A repeated key joins on commas.
  - **`--options` layers over `--config`**, and `--print-query` prints the merge.
  - **A saved card or a pasted query seeds the menu**; `askRequired` asks only for what is missing.
- **A saved card file is a query string in JSON** ([#111]): each option a string on the root,
  non-strings dropped on read, `card` and `version` reserved.
- **`CARD_FILE_VERSION` refuses a higher number and reads an absent one as 1.** Bump it with any
  change of shape, and ship the migration.
- **The menu stays open after a render, its cursor in place.**

## Prompts and the menu

- **Depend on each inquirer prompt used, not `@inquirer/prompts`** ([#88]). Each is a default export,
  and `Separator` comes from `@inquirer/select`; Renovate groups them, as they share `@inquirer/core`.
- **A numeric option uses `@inquirer/number`, stepping by `numericStep`** ([#89]), since its default
  step of `1` refuses a fraction. So `10px` cannot be typed for `border_radius`, though the api takes it.
- **No other prompts**: nothing is multi-line, and the menu wants a select.
- **A `list` option with `choices` is a checkbox** ([#46]); give `choices` only when every value is
  known. A saved list is split back, so the boxes reopen ticked.
- **The menu is grouped, and `group` on `CardOption` is required** ([#76]). The required params are a
  `CardField`, asked first; empty sections drop, and the shared options lead so the theme heads the
  colors.
- **The actions sit first, under their own heading** ([#76]), so `g`, `s`, `p` and `q` reach them
  from anywhere. Not `indexMode: 'number'`, whose numbers shift as the list scrolls. The list is as
  tall as the terminal.

## Rejected

- **A JSON Schema for the saved file** ([#111]): core's params are refines over strings, which
  `z.toJSONSchema` renders as bare strings, so the catalog would have to write it, through oxfmt.
- **A `config` input on the action reading this file** ([#111]): it coupled the two releases, and the
  query string does the job. The catalog now publishes `CARD_FILE_VERSION`, removing half that cost.

[#46]: https://github.com/stats-forge/github-stats-forge/pull/46
[#76]: https://github.com/stats-forge/github-stats-forge/pull/76
[#78]: https://github.com/stats-forge/github-stats-forge/pull/78
[#88]: https://github.com/stats-forge/github-stats-forge/pull/88
[#89]: https://github.com/stats-forge/github-stats-forge/pull/89
[#111]: https://github.com/stats-forge/github-stats-forge/pull/111
