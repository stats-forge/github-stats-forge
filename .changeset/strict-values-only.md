---
'@stats-forge/github-stats-forge-core': minor
---

fix!: refuse a boolean, `number_format` or theme a card does not know

A boolean is `true` or `false`, `number_format` is `short` or `long`, and `theme`, `theme_light`
and `theme_dark` name a theme; anything else is an `invalid_param` rather than the card's default.
Fixed values now match case-insensitively.
