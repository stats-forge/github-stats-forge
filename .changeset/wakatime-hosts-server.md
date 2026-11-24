---
'@stats-forge/github-stats-server': minor
---

fix!: refuse a `wakatime_host` that `WAKATIME_HOSTS` does not list, `wakatime.com` alone by default

Set `WAKATIME_HOSTS=wakatime.com,your-wakapi.example.com` to keep serving a self-hosted WakaTime.
