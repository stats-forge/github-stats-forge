---
'@stats-forge/github-stats-forge-core': minor
---

refactor(core)!: remove the package root entry point

`@stats-forge/github-stats-forge-core` no longer resolves —
every export it carried was already reachable from a subpath,
so the subpath is now the only way in:

- `stats`, `pin`, `topLangs`, `gist`, `wakatime`, `CardConfig`, `PersonalAccessToken`, `FetchLike`, `ApiResult`, `ApiError`, `themes`, `ThemeName` → `@stats-forge/github-stats-forge-core/api`
- `fetchWakatimeStats`, `retryer` → `@stats-forge/github-stats-forge-core/fetchers`
