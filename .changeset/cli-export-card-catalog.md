---
'@stats-forge/github-stats-forge-cli': minor
---

feat(cli): export the card catalog

`./cards` now exposes `cards`, `findCard` and `COMMON_OPTIONS`,
so a second UI over the same options reads one list rather than keeping its own.
The documentation site's card builder is the first to do it.
