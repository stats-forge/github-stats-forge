---
'@stats-forge/github-stats-forge-core': patch
---

fix: resolve a language's color whatever its case

WakaTime and gist languages are not always spelled the way linguist spells them,
and a casing difference drew the default gray instead of the language's brand color.
