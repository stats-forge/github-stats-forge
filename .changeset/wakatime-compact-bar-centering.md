---
'@stats-forge/github-stats-forge-core': patch
---

fix: center the wakatime compact layout's progress bar

The track was 5px narrower than the card's own padding allowed and the stacked
segments were drawn from the card's edge rather than from the track's, so the bar
sat off centre and its first language lost 25px to the mask.
