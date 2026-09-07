---
'@stats-forge/github-stats-forge-core': minor
---

feat(core): interpolate translations, and give each card its own locale table

A wording carries the values drawn into it as `{name}` placeholders,
so word order and the possessive belong to the translation rather than to the card.
Where the wording depends on a number it writes a form per plural category,
picked by the locale's own rules — which is what makes a single contribution
read `1 contribution` rather than `1 contributions`.

`src/translations.ts` is gone: each card is now a folder holding its renderer and its
`locales.ts`, and the tables are plain data instead of functions rebuilt on every render.
