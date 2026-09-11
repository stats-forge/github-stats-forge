---
'@stats-forge/github-stats-forge-cli': patch
---

feat: ask a numeric option as a number, not as text

The eighteen numeric options fell through to a text prompt,
so anything typed reached the query string unchecked.
A count refuses a fraction now, and a weight takes one.
