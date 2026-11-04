---
'@stats-forge/github-stats-forge-core': minor
'@stats-forge/github-stats-forge-catalog': minor
---

feat!: take one theme, or a `light,dark` pair, as the only color option

The color params and `theme_light`/`theme_dark` are gone: a pair such as `theme=ember_light,ember_dark`, the default, follows the viewer's color scheme. Adds `github_light`, `github_dark` and `github_dark_dimmed`.
