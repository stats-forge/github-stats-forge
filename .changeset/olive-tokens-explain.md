---
'@stats-forge/github-stats-server': patch
---

docs: say what token the two organization cards need

Organization data is granted separately from personal data, so the token that draws a stats
card is not automatically one that draws an organization card. Both pages now carry the
grant each kind of token needs, rather than leaving it to be discovered from an error.
