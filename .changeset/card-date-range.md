---
'@stats-forge/github-stats-forge-core': minor
---

feat(core)!: count the `stats` and `contributedTo` cards within a date range

`from` and `to` replace `commits_year`, and give the `contributedTo` card the same pair.
Each accepts `2024`, `2024-03` or `2024-03-15` and covers the whole of what it names,
so `from=2024` starts on the 1st of January and `to=2024` ends on the 31st of December.
Either end may be left open;
a date outside 2008 through this year, or a `from` after its `to`, is rejected.

`commits_year` also counted a day too many:
GitHub reads an omitted `to` as a year after `from`,
so `?commits_year=2024` included the 1st of January 2025.
