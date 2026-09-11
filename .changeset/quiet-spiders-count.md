---
'@stats-forge/github-stats-server': patch
---

fix: let the anvil's fractional options take a fraction

Every numeric field carried an implicit step of `1`,
so `border_radius`, `size_weight` and `count_weight` refused a typed `4.5`.
