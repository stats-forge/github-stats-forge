---
'@stats-forge/github-stats-forge-core': patch
'@stats-forge/github-stats-forge-cli': patch
---

ci: publish with npm trusted publishing (OIDC)

Releases mint their npm credentials from the workflow's OIDC token, so they carry
provenance and there is no publish token to rotate. Neither package's API changes.
