---
'@stats-forge/github-stats-forge-core': minor
---

feat(core): put every card's remaining English text through `I18n`

The `contributedTo` and gist cards read their words from a locale table now
and accept `locale`, as do the stats card's `Rank` label
and the repo card's missing description and unspecified language.

`I18n#t` falls back to the English string when a locale has no entry for a key,
so a key can be written in English and translated later —
before, such a key threw and failed the whole card.
