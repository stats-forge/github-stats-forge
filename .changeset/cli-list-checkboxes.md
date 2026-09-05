---
'@stats-forge/github-stats-forge-cli': minor
---

feat(cli): pick a comma-separated list from checkboxes

`show`, `hide` and `role` name a closed set of values,
so they are now a checkbox prompt rather than a line to type commas into:
nothing has to be remembered or spelled right.
The lists whose values are a repository or a language have no such set and stay free text.

Every prompt's choices now come from core's `OPTIONS`, including `number_format`,
which the catalog had spelled out itself in two places.
