---
'@stats-forge/github-stats-forge-core': minor
---

fix!: refuse a `show`, `hide` or `role` entry the card does not know

A list drawn from a fixed set is now an `invalid_param` when one entry is unknown, rather than
ignoring it, and matches case-insensitively. `role` is checked at the api boundary instead of in
the fetcher.
