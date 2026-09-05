---
'@stats-forge/github-stats-forge-core': minor
---

feat(core): add the `contributedTo` card

The repositories a user has contributed to, all-time, ranked, with a mark per
contribution year showing which ones each repository got. It reuses the walk `stats`
already runs for `all_time_contributed_to`, so it costs no extra request.

`contributions` counts commit-days, not commits: GitHub groups commit contributions by
day.
