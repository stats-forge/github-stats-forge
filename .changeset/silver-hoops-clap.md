---
'@stats-forge/github-stats-forge-core': minor
'@stats-forge/github-stats-forge-cli': minor
---

chore!: narrow the supported Node range to `^24 || >=26`

`engines.node` was `>=24`, so Node 25 no longer qualifies.
It is an odd-numbered line that never reaches LTS,
and dropping it keeps the supported set to the two versions CI runs.

Runtime dependencies move too:
`zod` to `^4.5.4` in core, and `@inquirer/prompts` to `8.7.0` in the CLI.
