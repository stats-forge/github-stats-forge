---
'@stats-forge/github-stats-forge-core': patch
---

refactor(core): share one handler shape across the api endpoints

Every endpoint is now `cardHandler(schema, render)`,
so the color pass, the query parse and the error card are written once rather than in each handler.
The fetchers classify a GraphQL `NOT_FOUND` through the same helper,
`clampValue` and `buildSearchFilter` take the typed values their callers already pass,
and `measureText` no longer rebuilds its width table on every call.
