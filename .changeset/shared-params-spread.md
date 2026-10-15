---
'@stats-forge/github-stats-forge-core': patch
---

refactor: declare the params cards share once

The options every card takes, the title options and the stat-row options are each declared in one
place and spread into the cards that take them. What each endpoint accepts is unchanged.
