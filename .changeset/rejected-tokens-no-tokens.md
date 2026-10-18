---
'@stats-forge/github-stats-forge-core': patch
'@stats-forge/github-stats-server': patch
---

fix: report every token GitHub rejected as `no_tokens`, not a rate limit

An expired or revoked token now asks to be replaced instead of to be waited out.
