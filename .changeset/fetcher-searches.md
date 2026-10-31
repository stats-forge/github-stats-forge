---
'@stats-forge/github-stats-forge-core': minor
---

refactor!: ask the fetchers for search counts with one `searches` list
`fetchStats`, `fetchRepo` and `fetchRepoUserStats` take `searches: ['prs_opened', …]` in place of the five `include_prs_*`/`include_issues_*` flags; `ownerAffiliations` takes `RepositoryAffiliation` values only.
