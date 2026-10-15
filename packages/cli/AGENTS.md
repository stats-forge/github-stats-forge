# The CLI

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

`packages/cli` is `@stats-forge/github-stats-forge-cli`, whose `bin` (`github-stats-forge`) points
at `./bin.js`. `pnpm dev` is `node --conditions=@stats/source src/index.ts`: no build step, because
relative imports name `.ts` and Node strips the types. The condition resolves `packages/core/src`;
pnpm's workspace link is a symlink whose realpath falls outside `node_modules`, so Node agrees to
strip types there. From the root, `pnpm cli` builds and runs it against the root `.env`, forwarding
its flags.

## Rules

- **`bin.js` is the one committed `.js` file, and it has to be** ([#78]). pnpm links a bin while it
  installs, before anything is built, so a `bin` naming `build/index.js` fails every clean install.
  It cannot be TypeScript: Node refuses to strip types under `node_modules`, where a consumer's copy
  lives.
- **stdout carries the result; everything else goes to stderr** — the spinner, the error report,
  the status line. The spinner degrades to one printed line when stderr is not a TTY.
- **Printing renders nothing, so it asks for no token and needs no terminal** ([#111]). Both guards
  in `main` let `--print-query` through; a change to either must keep that true.
- **The query string is the interchange format, both ways** ([#111]). `--print-query` and the menu's
  Print write it; `--options` reads it — what the action's `options` input, a card URL and the
  anvil's query box all carry. `toQueryString` writes the leading `?`; `fromQueryString` takes it
  with or without, or a whole card URL. A repeated key joins on commas.
  - **`--options` layers over `--config`**, so one saved card plus one option is a variant rather
    than a second file. `--print-query` prints the merge.
  - **A saved card or a pasted query seeds the menu, and `askRequired` asks only for what is still
    missing.**
- **A saved card file is a query string in JSON** ([#111]): every option on the root, each a string,
  so it reads like the URL it stands for. A non-string option is dropped on read. `card` and
  `version` are reserved names. `params` stays the word for the query on its way to a handler.
- **`CARD_FILE_VERSION` makes the next format change survivable.** A file naming a higher number was
  written by a newer build and is refused; an absent version reads as 1. Bump it in the same change
  that changes the shape, and give the reader the migration.
- **The menu stays open after a render**, with the cursor where it was: a card is rarely right the
  first time.

## Prompts and the menu

- **Depend on the inquirer prompts used, not on `@inquirer/prompts`** ([#88]); the meta-package
  brings every prompt and their dependencies to every consumer. Each prompt is a **default**
  export, and `Separator` comes from `@inquirer/select`. Renovate groups them, because they share
  one `@inquirer/core`.
- **A numeric option is asked with `@inquirer/number`** ([#89]), stepping by the catalog's
  `numericStep`. Its own `step` defaults to `1` and validates against it, so a `number` option
  without `'any'` would refuse a fraction. The cost accepted: `10px` can no longer be typed for
  `border_radius`, though the api still takes it.
- **Leave the other unused prompts out**: nothing is multi-line, the menu wants a select rather than
  `expand` or `rawlist`, and prefix type-ahead already reaches every theme.
- **A `list` option with `choices` is a checkbox, not a line of commas** ([#46]). Give a `list`
  `choices` only when every value it accepts is known; a repository or a language list stays free
  text. A saved list is split back on read, so the boxes reopen ticked.
- **The option menu is grouped, and an option carries its own section** ([#76]). `group` on
  `CardOption` is **required**, so a new option cannot go ungrouped; the required params are
  `CardField`, asked before the menu opens. An empty section is dropped, and the shared options
  come first so the theme heads the colors section.
- **The actions carry a heading of their own and sit first, so type-ahead reaches them** ([#76]).
  `g`, `s`, `p` and `q` reach Generate, Save, Print and Quit from anywhere, beating any option
  sharing the letter. An action added below the sections would lose it.
  - **Not `indexMode: 'number'`**: it numbers rows by the separators on the visible page, so numbers
    shift as a grouped list scrolls.
  - The list is as tall as the terminal (`process.stdout.rows`, less the message and help line).

## Rejected, with what to keep if it returns

- **A JSON Schema for the saved card file** ([#111]). Core's zod schemas cannot generate it — every
  param is a refine over a string, which `z.toJSONSchema` renders as a bare string — so the catalog
  would have to; and the output has to go through oxfmt.
- **A `config` input on the GitHub action reading this file** ([#111]). It coupled the action's
  release to the CLI's and put a second `CARD_FILE_VERSION` in another repository; the query string
  does the job with no coupling. Half that tradeoff has since reversed: the catalog now publishes
  `CARD_FILE_VERSION`.

[#46]: https://github.com/stats-forge/github-stats-forge/pull/46
[#76]: https://github.com/stats-forge/github-stats-forge/pull/76
[#78]: https://github.com/stats-forge/github-stats-forge/pull/78
[#88]: https://github.com/stats-forge/github-stats-forge/pull/88
[#89]: https://github.com/stats-forge/github-stats-forge/pull/89
[#111]: https://github.com/stats-forge/github-stats-forge/pull/111
