---
'@stats-forge/github-stats-forge-core': patch
---

fix: keep the repo card's `show` stats clear of their values

Each column now places its values after its widest label, so a long label no longer runs into its
number. A card drawing two columns defaults to the 500px width step instead of 430px.
