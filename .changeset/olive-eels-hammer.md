---
'@stats-forge/github-stats-server': minor
---

feat(server): serve the cards over HTTP, in a container image

An HTTP server over core's api handlers, and the image it ships in.
One path per card, `200` with the drawn error card by default so a README shows the reason
rather than a broken image, and the truth in `Card-Status` / `Card-Error-Code` headers —
`STRICT_HTTP_STATUS=true` answers with real status codes instead.
Caching is a three-row TTL table plus a copy the process holds,
so a hot README costs one GitHub request per TTL rather than one per view.

The image runs the TypeScript sources: no build step, nothing bundled,
and what runs in the container is what is in the repository.
It is published to GHCR by the same release that publishes to npm.
