---
'@stats-forge/github-stats-forge-core': minor
---

fix!: refuse a whole-number param with no number in it

`card_width`, `line_height`, `langs_count`, `repos_count`, `number_precision`,
`description_lines_count` and `days` are now `invalid_param` when they hold no number, rather than
reaching the card as `NaN`; `?line_height=abc` drew `NaN` into the SVG. A card's `line_height` option
is typed `number`.
