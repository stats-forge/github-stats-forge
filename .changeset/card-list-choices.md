---
'@stats-forge/github-stats-forge-core': minor
---

feat(core)!: gather each card's accepted option values into one `OPTIONS` object

Every handler now carries `OPTIONS`, keyed by the query param each set governs:
`stats.OPTIONS.rank_icon`, `topLangs.OPTIONS.layout`, `wakatime.OPTIONS.display_format`.
This replaces the flat properties, so `stats.RANK_ICONS` becomes `stats.OPTIONS.rank_icon`,
`topLangs.LAYOUTS` becomes `topLangs.OPTIONS.layout`,
and `wakatime.DISPLAY_FORMATS` becomes `wakatime.OPTIONS.display_format`.

It also covers the comma-separated params, which had no published list at all:
`show`, `hide` and `role`, so a UI can offer their values the way it offers an enum's.
The values live on the render function that draws them and the handler forwards them,
so what renders, what validates and what a UI offers cannot drift apart.
