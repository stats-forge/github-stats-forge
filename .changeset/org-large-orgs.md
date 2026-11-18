---
'@stats-forge/github-stats-forge-core': minor
'@stats-forge/github-stats-server': patch
---

fix!: draw the organization card for large organizations, which GitHub timed out on

`fetchOrganization` counts releases and commits only under `include_releases` and `include_commits`, and returns `null` for them otherwise.
