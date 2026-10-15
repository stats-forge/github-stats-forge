---
'@stats-forge/github-stats-forge-core': minor
---

fix!: match `exclude_repo` the same way on every card

The stats and top-languages cards now read an entry as `owner/name` or `name`, ignoring case, as
the contributed-to card already did, and `EXCLUDE_REPO` with them. An entry outside the characters a
repository name can hold is an `invalid_param`.
