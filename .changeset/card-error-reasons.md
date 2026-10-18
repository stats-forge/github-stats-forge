---
'@stats-forge/github-stats-forge-core': minor
---

refactor!: throw every failure by name, through `CardError.because`

`CardError.forbidden`, `notAllowed`, `invalidParam` and `missingParam` are gone:
throw `CardError.because('members_forbidden')`, `CardError.because('missing_param', { params })` and the
like; a reason that needs data fails to compile without it.
A `CardError` carries `reason` and `reportable`, and `FailureReason` is exported.
A repository that cannot be found now always says "Repository not found".
