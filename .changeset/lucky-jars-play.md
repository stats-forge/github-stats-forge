---
'@stats-forge/github-stats-server': minor
---

feat(server): answer 403 for an account a pinned instance does not serve

`ALLOWLIST` and `GIST_ALLOWLIST` now do what the README said they did,
core having started enforcing them.
`STRICT_HTTP_STATUS` maps the new `not_allowed` code to `403`,
and the README says plainly that the list does not cover the wakatime card
and is not authentication.
