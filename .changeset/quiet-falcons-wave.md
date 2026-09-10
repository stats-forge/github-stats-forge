---
'@stats-forge/github-stats-server': patch
---

ci: publish the image, which the release gate had been skipping

`release.yml` read the changesets action's output as `hasChangesets`,
where v2 names it `has-changesets`.
