---
'@stats-forge/github-stats-forge-core': patch
---

fix: widen the compact top-languages card to fit its longest label

A long name such as "Jupyter Notebook" in the second column ran past the card's edge.
The card now takes the next width step when its labels need it, and an explicit
`card_width` grows only as far as they do.
