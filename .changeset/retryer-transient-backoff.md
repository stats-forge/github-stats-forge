---
'@stats-forge/github-stats-forge-core': patch
---

fix: retry a transport failure with the same token, after a backoff

A network error used to fail the card at once. The retryer now retries it with the same token
after 100ms, 1s and 3s, and only then throws — as `upstream`, carrying the original as `cause`,
rather than letting the runtime's own wording reach the card. A request the host's transport
aborted is not retried, so a `fetch` timeout still means what it says.
