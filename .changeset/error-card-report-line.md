---
'@stats-forge/github-stats-forge-core': minor
---

fix(core): point the error card's report link at this project

The inherited text pointed at a shortener that redirects to the upstream project,
so every reported bug went to the wrong repository.
It now reads `File an issue at https://tinyurl.com/stats-forge-bug`,
on its own line under the message because it no longer fits beside the title.
