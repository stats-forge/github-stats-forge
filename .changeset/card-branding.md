---
'@stats-forge/github-stats-forge-core': minor
---

feat(core)!: draw every card from one type scale, with a title icon and a banded header

`common/brand.ts` owns the font stack, the type scale, the weights and the widths,
so a card composes from it rather than writing a `font` shorthand of its own.
Every card now has a banded header:

- a tint behind the title that follows the card's own corners
- a title icon distinct per card, and a short rule beneath that icon
- both drawn in the theme's icon color so they read against the title

Default widths snap to 300, 400 or 500:

- `stats` moves from 287 to 300 and, with its rank, from 450 to 500,
- `contributedTo` from 450 to 500, `wakatime` from 495 to 500,
- `donut` layout from 350 to 400.
  Pass `card_width` to keep a card at the size it is.
