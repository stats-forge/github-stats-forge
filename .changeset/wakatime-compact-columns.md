---
'@stats-forge/github-stats-forge-core': patch
---

fix: keep long language names in the compact WakaTime card from running into each other

A compact `card_width` too narrow for the labels is widened to fit them, and the card no longer rewrites the percentages of the data it is given.
