---
'@stats-forge/github-stats-forge-core': minor
---

feat!: give `ApiError` a `reason` and a printable `text`, and let a host word its own advice through `CardConfig.hints`

The second lines of `tokens_missing`, `tokens_rejected` and `rate_limited` no longer assume the hosted server; pass `hints` to give your own.
