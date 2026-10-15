# The catalog

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

`packages/catalog` is `@stats-forge/github-stats-forge-catalog`: what each card accepts — every
option's query param, label, kind, group, hint and accepted values — with the core handler that
draws the card beside it as `render`. **Two forms read it and neither owns it**: the CLI's prompts
and the site's anvil.

**It was the CLI's `./cards` export until 2026-09-13.** Reading a card's options off npm meant
installing the CLI, and with it the six `@inquirer/*` packages a form over those options never
calls. The list moved to a package whose one dependency is core, and the CLI became an ordinary
consumer of it; `cli/cards` is **gone** rather than kept as a re-export, because a second path to
one list is the drift this package exists to prevent.

**An option's `kind` and `choices` are core's, and `tests/catalog.spec.ts` holds them to it.**
Each handler carries `PARAMS`, how a form asks for every param its schema reads — `intParam` is an
`integer`, `numberParam` a `number`, an `enumParam` a `choice` with its values — and `OptionKind` is
core's `ParamKind`. The test fails on an option core reads differently, and on a param of a card's
own that the catalog never asks for; only the colors past the menu's few are exempt. The mapping was
kept by hand until 2026-10-15, with `line_height` the one that was easy to get wrong.

- **It imports core's public api and nothing else.** That is what keeps it a few hundred bytes in
  a browser bundle, and what lets `apps/server` hold it as a devDependency for one test without it
  reaching the image. Anything wanting a prompt, a DOM or a file system belongs to the form.
- **Choices come from core's exports, never a copy.** Every `choices` in `src/index.ts`
  is `<handler>.OPTIONS.<param>` — `stats.OPTIONS.rank_icon`, `topLangs.OPTIONS.layout`,
  `pin.OPTIONS.number_format` — with `Object.keys(themes)` the one exception, so a prompt
  cannot offer a value the schema would reject and the option's `name` and its `choices`
  key read the same. **No `choices` array is written out here**: a literal in this file is
  a copy that drifts, which is exactly what `['short', 'long']` did in two card entries
  until 2026-09-05.
- **`numericStep` is what both forms read, and neither decides for itself.** It answers `1`,
  `'any'` or `undefined`, which is `<input type="number">`'s vocabulary and happens to be
  `@inquirer/number`'s too — so the CLI passes it as `step` and the anvil sets it on the field.
  The anvil branched on `kind === 'number'` of its own accord until this landed, which is exactly
  how a new kind goes silently unhandled: adding one there would have left every integer field
  without a numeric keyboard.
- **No `min` or `max`.** The renderer clamps what the schema lets through —
  `clampValue(langs_count, 1, MAXIMUM_LANGS_COUNT)` — so a silly count is corrected rather
  than refused, and bounds here would only duplicate that in a second place.
- **`CARD_FILE_VERSION` lives here, not beside the writer.** The CLI and the anvil both write the
  saved card file, so the number that versions it belongs to the list they share. It was in the
  CLI's `./cards` for the same reason before this package existed: `src/index.ts` runs `main()` on
  import, so the browser cannot reach a constant declared there.
- **`tests/catalog.spec.ts` holds the invariants a published list owes**: one entry per card, no
  param asked twice once the shared options sit in front of a card's own, no empty `choices`, and
  a step that follows the kind. What each form then does with them is that form's own test.
