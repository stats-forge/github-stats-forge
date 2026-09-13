---
'@stats-forge/github-stats-forge-core': patch
---

fix: only read PAT_1, PAT_2, ... as tokens, in name order

The pattern was unanchored, so any variable ending in `PAT_` and digits (e.g., `AZURE_PAT_1`) in a shared env file or a compose stack was picked up and sent to GitHub as a bearer token.
