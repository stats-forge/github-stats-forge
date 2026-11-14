---
'@stats-forge/github-stats-forge-core': patch
'@stats-forge/github-stats-forge-catalog': patch
'@stats-forge/github-stats-forge-cli': patch
---

fix: rename the source export condition to `@github-stats-forge/source`, so another workspace's `@stats/source` no longer loads TypeScript from `node_modules`
