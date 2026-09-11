---
'@stats-forge/github-stats-forge-cli': minor
---

feat!: move the card catalog to `@stats-forge/github-stats-forge-catalog`

The `./cards` export is gone: `cards`, `findCard`, `COMMON_OPTIONS`, `OPTION_GROUPS`
and `numericStep` come from that package now.
Nothing about the prompts changes.
