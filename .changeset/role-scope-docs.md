---
'@stats-forge/github-stats-server': patch
---

docs: say what `role` actually scopes on the stats card

It filters the repository list behind the stars total alone, not every stat, and the
stars it widens still count towards the rank even under `hide=stars`.
