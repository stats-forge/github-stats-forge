---
'@stats-forge/github-stats-forge-core': minor
'@stats-forge/github-stats-forge-cli': minor
---

fix!: fetch WakaTime stats only from the hosts `CardConfig.wakatimeHosts` lists, `wakatime.com` alone by default

Pass `wakatimeHosts`, or set `WAKATIME_HOSTS` where `fromEnv` or the CLI reads it, to keep a self-hosted WakaTime.
