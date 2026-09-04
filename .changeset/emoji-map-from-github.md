---
'@stats-forge/github-stats-forge-core': minor
---

feat(core)!: generate the emoji map from GitHub's own shortcodes

`emoji-name-map` is gone,
replaced by a table generated from `emojibase-data` that matches GitHub's own list exactly.
649 more shortcodes resolve, every country flag among them,
and 158 gain the presentation selector they were missing: `:coffee:` is `☕️`, not `☕`.
`:+1:` and `:-1:` render for the first time.
