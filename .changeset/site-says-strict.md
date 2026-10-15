---
'@stats-forge/github-stats-server': patch
---

docs: say what the stricter params refuse

The theme pages call an unknown theme an error, the stats and top-languages pages take
`exclude_repo` as `owner/name` or `name`, and the WakaTime fetcher page says `api_domain` is a host
and an optional port.
