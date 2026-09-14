---
'@stats-forge/github-stats-forge-core': minor
---

fix!: hold the padding under a card's last row at 18px

Six cards sized themselves as `45 + (n + 1) * lheight`, so the spare row landed under the
last one as bottom padding and grew with `line_height` — 24px on the stats, organization
and activity cards, 22px on wakatime and 33px on top-languages, against a uniform 17px
above the title. Height is now content plus `CARD_STYLE.padding.bottom`, and the measures
`brand.ts` exports are one `CARD_STYLE` const read with dot notation.
