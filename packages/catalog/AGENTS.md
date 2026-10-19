# The catalog

> Scoped to this tree; the repo-wide rules are in the root `AGENTS.md`.

`@stats-forge/github-stats-forge-catalog` is what each card accepts (every option's param, label,
kind, group, hint and values), with the core handler beside it as `render`. **The CLI and the anvil
both read it; neither owns it** ([#126]).

- **It imports core's public api only**, so it stays small in a browser and stays a devDependency of
  `apps/server` that never reaches the image. Prompts, a DOM and files belong to the forms.
- **It is the one path to this list**: the CLI's old `./cards` export was removed, not re-exported.
- **`kind` and `choices` are core's** ([#235]): `OptionKind` is core's `ParamKind`, and
  `tests/catalog.spec.ts` fails on an option core reads differently or a param the catalog never asks
  for, bar the colors past the menu's few.
- **Every `choices` is `<handler>.OPTIONS.<param>`**, `Object.keys(themes)` the one exception; a
  literal array drifts.
- **`numericStep` answers `1`, `'any'` or `undefined` for both forms** ([#89]), so neither branches on
  `kind` and misses a new one.
- **No `min` or `max`**: the renderer already clamps.
- **`CARD_FILE_VERSION` lives here**: the CLI and the anvil both write the file, and the CLI's
  `src/index.ts` runs `main()` on import.
- **`tests/catalog.spec.ts` holds the list's invariants**: one entry per card, no param twice, no
  empty `choices`, a step that follows the kind, and each `render` matching its id.

[#89]: https://github.com/stats-forge/github-stats-forge/pull/89
[#126]: https://github.com/stats-forge/github-stats-forge/pull/126
[#235]: https://github.com/stats-forge/github-stats-forge/pull/235
