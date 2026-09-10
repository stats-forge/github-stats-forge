---
'@stats-forge/github-stats-forge-core': minor
---

fix(core)!: enforce the allowlists, which were parsed and never checked

`ALLOWLIST` and `GIST_ALLOWLIST` are read into `CardConfig` and now enforced: the api handlers
refuse an identity the deployment does not name, before anything is fetched,
as a new `not_allowed` error code.
Until now the lists were consulted nowhere, so a deployment configured with either served anyone
who asked. **They are also renamed**, from the `WHITELIST` / `GIST_WHITELIST` the previous
release read; a deployment still setting those is not pinned.

It covers every GitHub login — `username`, and the organization card's `org` — and the gist
card's `id`, matched case-insensitively because GitHub logins are, with the spaces around
each entry ignored.
It does not cover the wakatime card, whose `username` is a WakaTime profile rather than a
GitHub login.

Three smaller changes come with it:
`ErrorCode` gains `not_allowed`, which a host branching on the union will want a case for;
`no_tokens` is now `retryable`, the fix being a token on the next start rather than a query change;
and a `PAT_` variable set to the empty string is now skipped rather than spending a retry.
