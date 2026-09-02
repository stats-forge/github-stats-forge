---
'@stats-forge/github-stats-forge-core': minor
---

feat(core)!: modernize card style

- The default `border_radius` is `8`, up from `4.5`.
- A theme that names no `border_color` derives one from its own background,
  so a dark card no longer gets the light `#e4e2e2` hairline.
  A color from the theme or the query wins.
- Animations honour `prefers-reduced-motion: reduce`, and the stat rows arrive sooner.

`border_radius=4.5` and `border_color=e4e2e2` bring the old style back.
