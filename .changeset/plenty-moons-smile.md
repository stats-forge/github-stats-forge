---
'@stats-forge/github-stats-forge-core': minor
---

refactor(core)!: remove the `/cards` entry point

`@stats-forge/github-stats-forge-core/cards` no longer resolves. Nothing consumed it —
the api handlers render internally, and a host that wants a card asks the handler for one.

The card data shapes it re-exported — `GistData`, `Lang`, `RepositoryData`, `StatsData`,
`TopLangData`, `WakaTimeData` —
are still available from `@stats-forge/github-stats-forge-core/fetchers`,
and each card's accepted values still ride on its handler (`stats.RANK_ICONS`, `topLangs.LAYOUTS`,
`wakatime.DISPLAY_FORMATS`). The render functions themselves, `renderError`,
and the `CardOptions` / `CommonCardOptions` types are now internal.
