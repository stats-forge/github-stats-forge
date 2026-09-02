---
'@stats-forge/github-stats-forge-core': patch
---

refactor(core): break the `fmt` ↔ `render` import cycle

`wrapTextMultiline` wraps text through `splitWrappedText`,
so it belongs next to it in `common/render.ts` rather than in `common/fmt.ts`.
`fmt.ts` now imports nothing and `render.ts` keeps its one-way import of `kFormatter`.
Both modules are internal, so nothing a consumer imports has moved.
