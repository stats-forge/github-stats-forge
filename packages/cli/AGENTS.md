# The CLI

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

`packages/cli` is `@stats-forge/github-stats-forge-cli`, whose `bin` (`github-stats-forge`)
points at `./bin.js`, but `pnpm dev` is
`node --conditions=@stats/source src/index.ts` — no build step, because relative imports
name `.ts` (see below) and Node strips the types. The condition is what makes it resolve
`packages/core/src` rather than core's `build`; pnpm's workspace link is a symlink whose
realpath falls outside `node_modules`, so Node does not refuse to strip types there.

From the repo root, `pnpm cli` builds both packages and runs the CLI there,
so it picks up the root `.env` the way `pnpm docs:cards` does.
Its flags are forwarded, so `pnpm cli --card stats` skips the first prompt.

**`bin.js` is the one committed `.js` file in the repository, and it has to be.** pnpm creates a
bin link while it installs, before anything is built, so a `bin` naming `build/index.js` fails with
`ENOENT` on every clean install, once per app depending on the CLI, and leaves the link
uncreated. The shim exists in the checkout, so the link is always made, and it carries the
`no-unassigned-import` override its three lines earn. It cannot be TypeScript: Node refuses to
strip types under `node_modules`, which is where a published consumer's copy lives.

**The CLI depends on the five inquirer prompts it uses, not on `@inquirer/prompts`.**
That meta-package pulls all ten, so `editor`, `expand`, `number`, `rawlist` and `search`
rode into every consumer's install for nothing — and `editor` brought
`@inquirer/external-editor`, `chardet`, `iconv-lite` and `safer-buffer` with it.
Ten packages left the lockfile on 2026-09-11. Two things follow:
`Separator` is imported from `@inquirer/select`, which re-exports it from `@inquirer/core`;
and each prompt is a **default** export, where the meta-package re-exported them as names.
Dependabot groups them as `inquirer`, because the five share one `@inquirer/core`
and a lone bump can leave two copies of it in the tree.

**`@inquirer/number` is the one prompt worth taking back out of the ten the meta-package
carried.** The eighteen numeric options fell through to a plain `input` until 2026-09-11,
so anything typed reached the query string unchecked. The other four stay gone: `editor`
has nothing multi-line to edit, `expand` and `rawlist` want a shortlist where the menu has
38 grouped rows, and `search` would buy substring matching over 79 themes that prefix
type-ahead already reaches. The narrowing to accept is that `?border_radius=10px` can no
longer be typed at the prompt, though the api still takes it and a config file holding it
still seeds as `10`.

**A number is an `integer` or a `number`, and core's own reading is what says which.**
A param core reads with `looseIntParam` is `parseInt`'d, so the option is `kind: 'integer'`
— `card_width`, `line_height`, `langs_count`, `repos_count`, `number_precision`,
`description_lines_count`, fifteen occurrences. One it reads with `numberParam` is
`parseFloat`'d and stays `kind: 'number'`: only `border_radius`, `size_weight` and
`count_weight`. **`line_height` is an integer**, which is easy to get wrong — it is a
`rawParam` at the boundary rather than either helper, and every card `parseInt`s it itself.
Neither schema is exported from core, so nothing checks this mapping; read
`packages/core/src/api/*.ts` when adding a numeric option.

- **`numericStep` in `src/cards.ts` is what both forms read, and neither decides for
  itself.** It answers `1`, `'any'` or `undefined`, which is `<input type="number">`'s
  vocabulary and happens to be `@inquirer/number`'s too — so the CLI passes it as `step`
  and the anvil sets it on the field. The anvil branched on `kind === 'number'` of its own
  accord until this landed, which is exactly how a new kind goes silently unhandled: adding
  one there would have left every integer field without a numeric keyboard.
- **The prompt's own `step` defaults to `1` and validates against it**, so a `number`
  option that forgets `'any'` refuses the fractional value it exists to take.
- **No `min` or `max`.** The renderer clamps what the schema lets through —
  `clampValue(langs_count, 1, MAXIMUM_LANGS_COUNT)` — so a silly count is corrected rather
  than refused, and bounds here would only duplicate that in a second place.

- **Choices come from core's exports, never a copy.** Every `choices` in `src/cards.ts`
  is `<handler>.OPTIONS.<param>` — `stats.OPTIONS.rank_icon`, `topLangs.OPTIONS.layout`,
  `pin.OPTIONS.number_format` — with `Object.keys(themes)` the one exception, so a prompt
  cannot offer a value the schema would reject and the option's `name` and its `choices`
  key read the same. **No `choices` array is written out here**: a literal in this file is
  a copy that drifts, which is exactly what `['short', 'long']` did in two card entries
  until 2026-09-05.
- **A `list` option with `choices` is a checkbox, not a line of commas.** `show`, `hide`
  and `role` name a closed set, so the prompt offers it and the answer is an
  `Array<string>` that `toParam` joins back. The lists whose values are a repository or a
  language have no such set and stay free text: give a `list` option `choices` only when
  every value it accepts is known. A saved list is split back into its values on read, so
  the boxes reopen ticked.
- **The option menu is grouped, and an option carries its own section.** `group` on `CardOption` —
  `data`, `display`, `text` or `colors` — is headed by the labels in `OPTION_GROUPS`: what it
  counts, what it shows, text and size, colors and border. It is **required**, so a new option
  cannot go ungrouped; the params a card cannot render without are `CardField`, which has no group
  because they are asked before the menu opens. A section none of a card's options fall under is
  dropped, the way the anvil drops a heading no card sits under. The shared options come first in
  `cards`, so the theme heads the colors section and a card's own color lands behind it.
- **The four actions carry a heading of their own, so no row in the menu is unheaded.**
  `Actions` sits above Generate, Save, Print and Quit, ruled to the same width as the option
  sections beneath it — a `Separator` first in the list, which `bounds.first` then steps past.
- **The four actions are reached by type-ahead, not by scrolling.** inquirer's `select` jumps to
  the first row whose name starts with what was typed, so `g`, `s`, `p` and `q` reach Generate,
  Save, Print and Quit from anywhere in a 38-row list, and the help line under the menu says so.
  The actions sit first, so they win the letter even where an option shares it — `Save these
options` beats `Show the stat icons` — but keep it that way: an action added below the sections
  would lose.
  - **`indexMode: 'number'` is not the alternative.** It numbers a row by subtracting the
    separators rendered _so far on the visible page_, so the numbers shift as a grouped list
    scrolls. Read `@inquirer/select`'s `renderItem` before reaching for it.
  - The list is as tall as the terminal (`process.stdout.rows` less the message, the help line and
    some air), so a grouped stats card — 30 options and five headings — fits one screen.
- **A saved card file is a query string in JSON**: every option on the root, each one a
  string, so it reads like the URL it stands for and survives hand-editing. An option that
  is not a string is dropped on read, because it could not have come off a query string.
  `card` discriminates them and `version` says which shape of the file it is, which makes
  those two names reserved — an option called either could not be addressed. The options sat
  under their own `options` key until 2026-09-13 and nothing reads that shape now. `params` stays
  the word for the query on its way to a handler.
- **`CARD_FILE_VERSION` is what makes the next format change survivable**, and it is the
  reason an unreadable file is an error rather than a surprise: a file naming a higher number
  was written by a newer build, so it is refused instead of rendered from options that may
  have been read wrong. An absent version is read as 1, there having been no format before
  it. Bump it in the same change that changes the shape, and give the reader the migration.
- **`CARD_FILE_VERSION` lives in `src/cards.ts`, not beside the writer**, because the anvil
  writes this file too and imports that entry — `src/index.ts` runs `main()` on import, so
  the browser cannot reach a constant declared there.
- **A JSON Schema for this file was built and removed on 2026-09-13**, as more machinery than
  the format then earned. Two findings worth keeping if it comes back: core's zod schemas
  cannot generate it — every param is a refine over a string, which `z.toJSONSchema` renders
  as a bare `{ "type": "string" }`, losing every enum, every pattern and
  `additionalProperties` — so the CLI catalog is the only thing that can; and the generated
  file has to go through oxfmt, since `pnpm format` formats JSON and would otherwise fight it.
- **The query string is the interchange format, and the CLI speaks it both ways.**
  `--print-query` and the menu's Print write it; `--options` reads it. That is what the action's
  `options` input, a hosted card URL and the anvil's query box all carry, so a card tuned here
  pastes straight into a workflow and back out again. `toQueryString` writes the leading `?`
  because that is how all three are written; `fromQueryString` takes it with or without, and takes
  a whole card URL too, since a URL is what gets copied. A repeated key joins on commas, matching
  how every list param already reaches a card.
  - **`--options` layers over `--config`**, so one saved card plus one option is a variant rather
    than a second file. `--print-query` prints that merge.
  - **Printing renders nothing, so it asks for no token and needs no terminal.** Both guards in
    `main` are written to let it through; a change to either has to keep that true, or
    `--print-query` stops working in the scripts it exists for.
  - **A saved card or a pasted query seeds the menu, and `askRequired` then asks only for what is
    still missing** — `--card stats --options 'theme=dark'` must still ask the username.
- **An action considered and rejected on 2026-09-13: a `config` input on the GitHub action**,
  reading this same saved-card file. It was built, reviewed and green, then dropped: it put a
  second `CARD_FILE_VERSION` in a repository that cannot see this one, and made the action's
  release depend on the CLI's. The query string does the same job with no coupling, at the cost of
  a workflow holding a snapshot you re-paste when the card changes. The patch is not kept; rebuild
  it from this note if the tradeoff ever reverses.

- **stdout carries the result; everything else goes to stderr** — the spinner, the error
  report, the status line. The spinner degrades to a single printed line when stderr is
  not a TTY.
- **The menu stays open after a render** and keeps the cursor where it was, because a card
  is rarely right the first time and the point of the option list is to change one thing
  and look again.
