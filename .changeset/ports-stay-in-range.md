---
'@stats-forge/github-stats-forge-core': patch
---

fix: refuse a WakaTime `api_domain` port outside 1–65535

Such a port used to pass the check and then fail as a retryable `upstream` error. A trailing slash
on `api_domain`, once trimmed, is refused like any other path.
