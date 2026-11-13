---
'@stats-forge/github-stats-forge-core': minor
---

refactor!: draw the cards with `@stats-forge/card-kit`, which now holds the frame, themes and query-string boundary

`CardError.fromGraphQL` is gone, and `CardError` and the themes are the kit's, re-exported unchanged.
