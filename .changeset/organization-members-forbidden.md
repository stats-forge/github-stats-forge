---
'@stats-forge/github-stats-forge-core': minor
---

fix(core)!: keep the organization card when the token may not read members

`membersWithRole` needs the organization `Members` permission,
which a GitHub App installation token does not carry by default.
GitHub answers `FORBIDDEN` on that one field and still returns the organization,
but the fetcher threw on any `errors` entry,
so a token without the permission lost the whole card — including the stats it could read.
That refusal is now tolerated: `publicMembers` comes back `null`
and the card leaves the member row out, whether or not `show` asked for it.
Any other GraphQL error still throws as before.

`OrganizationData.publicMembers` is therefore `number | null`.
