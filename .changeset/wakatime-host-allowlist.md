---
'@stats-forge/github-stats-forge-core': minor
---

fix!: fetch WakaTime stats only from the hosts `CardConfig.wakatimeHosts` lists, `wakatime.com` alone by default

Pass `wakatimeHosts` (or set `WAKATIME_HOSTS` for `fromEnv`) to keep a self-hosted WakaTime, or `'any'` where only the person running it can name the host.
