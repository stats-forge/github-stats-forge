---
'@stats-forge/github-stats-forge-core': patch
---

fix: center the stats card's rank ring in the space around it

The ring was centred in the gutter reserved for it,
which left 20px between it and the stat values but 45px between it and the card's edge.
It now sits halfway between the two.
