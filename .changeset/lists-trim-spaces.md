---
'@stats-forge/github-stats-forge-core': patch
---

fix: read a list typed with spaces or a trailing comma

`?show=prs_merged, reviews,` is `prs_merged` and `reviews`: every comma-separated param trims its
entries and drops the empty ones, where a space used to make an entry unknown or unsafe.
