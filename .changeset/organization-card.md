---
'@stats-forge/github-stats-forge-core': minor
---

feat(core): add an organization card

`org` draws an organization's description and what its public repositories add up to:
how many there are, the stars, forks and watchers they hold between them,
and how many issues and pull requests are open across them.
`show` adds releases, commits, public members, the most common language and the founding year.

`fetchOrganization` is the fetcher behind it, exported with its `OrganizationData`.
It reads public, non-fork repositories most-starred first and walks at most five pages of 100,
so `truncated` says when the totals it summed are a lower bound.
