---
'@stats-forge/github-stats-forge-core': minor
'@stats-forge/github-stats-server': minor
---

feat!: stricter, more consistent card params

- A malformed or unknown value is an `invalid_param` instead of being ignored: booleans,
  `number_format`, theme names, whole numbers, and `show`, `hide` and `role` entries.
- Fixed values match case-insensitively, and lists trim spaces and drop empty entries.
- WakaTime `api_domain` is a host and an optional port (1–65535); its `username` is one path segment.
- `exclude_repo` takes `owner/name` or `name`, ignoring case, on every card.
- Each api handler carries `PARAMS`, the kind and choices of every param it reads, and `COLOR_PARAM_KEYS`
  names the color params.
