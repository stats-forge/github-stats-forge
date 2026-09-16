---
'@stats-forge/github-stats-server': patch
---

ci: tag and release the server like any other package

Each version now gets a git tag and a GitHub release carrying its changelog entry, and the image
publishes off that release rather than off any push to `main` with no changesets left.
The self-hosting page says which image tags that leaves you to pin to.
