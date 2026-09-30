---
'@stats-forge/github-stats-forge-core': patch
'@stats-forge/github-stats-forge-catalog': patch
'@stats-forge/github-stats-server': patch
---

feat: animate the repository pin card, and let disable_animations stop it

The card was drawn without animation and nothing could change that. It now behaves like
every other card: the fade-in plays by default, and `disable_animations=true` turns it off.
