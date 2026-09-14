---
'@stats-forge/github-stats-forge-core': patch
---

fix: recover from the transient errors the all-time contributions walk provokes

A gateway timeout or `RESOURCE_LIMITS_EXCEEDED` now halves the request instead of failing the
card, an empty body is retried rather than read through — which threw a `TypeError` — and a
chunk leaves the queue only once it has resolved, so no range already counted is lost.
