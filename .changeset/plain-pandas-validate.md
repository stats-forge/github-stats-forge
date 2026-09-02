---
'@stats-forge/github-stats-forge-core': patch
---

fix(core): reject malformed GitHub usernames at the api boundary

`username` was only checked against the safe character set,
so a login GitHub could never issue still reached the fetchers:
`-user`, `a--b`, anything longer than 39 characters.
The stats, top-languages and pin endpoints now check its shape through `usernameParam`,
which rejects it as `invalid_param` before any request is made.

Drops the `github-username-regex` dependency and its `declare module` shim:
the package's whole contents were the one regex literal now in `common/constants.ts`,
shared with the guard in `totalItemsFetcher`.
