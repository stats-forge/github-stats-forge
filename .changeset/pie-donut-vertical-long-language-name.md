---
'@stats-forge/github-stats-forge-core': patch
---

fix: widen the top-languages pie and vertical donut to fit their longest label

Both now centre on the card's width, so a `card_width` wider than 300 moves the chart to the middle.
