---
'@stats-forge/github-stats-forge-core': minor
---

refactor!: throw every failure by name, through `CardError.because`

`CardError.forbidden`, `notAllowed`, `invalidParam` and `missingParam` are gone; call `CardError.because(reason, data)`.
A missing repository now always says "Repository not found".
