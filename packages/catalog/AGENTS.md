# The catalog

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

`packages/catalog` is `@stats-forge/github-stats-forge-catalog`: what each card accepts — every
option's query param, label, kind, group, hint and accepted values — with the core handler that
draws the card beside it as `render`. **Two forms read it and neither owns it**: the CLI's prompts
and the site's anvil ([#126]).

- **It imports core's public api and nothing else.** That keeps it small in a browser bundle and
  lets `apps/server` hold it as a devDependency without it reaching the image. Anything wanting a
  prompt, a DOM or a file system belongs to the form.
- **There is one path to this list.** It was the CLI's `./cards` export, now gone rather than
  re-exported: a second path to one list is the drift this package exists to prevent.
- **An option's `kind` and `choices` are core's, and `tests/catalog.spec.ts` holds them to it**
  ([#235]). Each handler carries `PARAMS`, and `OptionKind` is core's `ParamKind`. The test fails on
  an option core reads differently, and on a param of a card's own the catalog never asks for; only
  the colors past the menu's few are exempt.
- **Choices come from core's exports, never a copy.** Every `choices` is
  `<handler>.OPTIONS.<param>`, with `Object.keys(themes)` the one exception. A literal array here is
  a copy that drifts.
- **`numericStep` is what both forms read, and neither decides for itself** ([#89]). It answers `1`,
  `'any'` or `undefined`, the vocabulary of `<input type="number">` and `@inquirer/number` alike.
  A form branching on `kind` itself is how a new kind goes silently unhandled.
- **No `min` or `max`.** The renderer clamps what the schema lets through, so bounds here would
  duplicate that in a second place.
- **`CARD_FILE_VERSION` lives here, not beside the writer**: the CLI and the anvil both write the
  saved card file. The CLI's `src/index.ts` runs `main()` on import, so the browser could not reach
  a constant declared there.
- **`tests/catalog.spec.ts` holds the invariants a published list owes**: one entry per card, no
  param asked twice, no empty `choices`, a step that follows the kind, and each card's render
  matching its id. What each form does with them is that form's own test.

[#89]: https://github.com/stats-forge/github-stats-forge/pull/89
[#126]: https://github.com/stats-forge/github-stats-forge/pull/126
[#235]: https://github.com/stats-forge/github-stats-forge/pull/235
