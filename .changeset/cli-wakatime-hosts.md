---
'@stats-forge/github-stats-forge-cli': minor
---

fix!: fetch WakaTime stats only from the hosts `WAKATIME_HOSTS` lists, `wakatime.com` alone by default

Set `WAKATIME_HOSTS=wakatime.com,your-wakapi.example.com` in the environment or the env file to keep a self-hosted WakaTime.
