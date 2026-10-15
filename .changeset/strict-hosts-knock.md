---
'@stats-forge/github-stats-forge-core': minor
---

fix!: refuse a WakaTime `api_domain` that is more than a host

`api_domain` is now a host and an optional port; a path, a query or credentials are an
`invalid_param`, so a query can no longer steer the server's request past the host it names.
The WakaTime `username` must be one path segment.
