---
'@stats-forge/github-stats-forge-core': patch
'@stats-forge/github-stats-forge-catalog': patch
'@stats-forge/github-stats-server': patch
---

feat: let the gist card's animation be turned off

`disable_animations=true` stops the fade-in, as it already does on the other cards.
The card animates by default, which is what it did before.
