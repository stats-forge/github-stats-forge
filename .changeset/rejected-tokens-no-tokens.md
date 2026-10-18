---
'@stats-forge/github-stats-forge-core': patch
'@stats-forge/github-stats-server': patch
---

fix: report every token GitHub rejected as `no_tokens`, not a rate limit

An expired or revoked token used to draw "Downtime due to GitHub API rate limiting", which waiting
never fixes.
The card now says every token was rejected and asks for them to be replaced.
