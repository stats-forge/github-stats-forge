---
'@stats-forge/github-stats-forge-cli': minor
---

feat(cli)!: rename a saved card's `params` to `options`

A saved card is `{ card, options }` now, matching what the menu calls them
and what a render function takes:

```json
{
  "card": "stats",
  "options": {
    "username": "anuraghazra",
    "theme": "tokyonight"
  }
}
```

A file written by an earlier version still loads its card,
but its `params` are ignored — rename the key to keep them.
