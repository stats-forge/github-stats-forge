---
'@stats-forge/github-stats-forge-core': patch
---

fix(core): count the repositories a language appears in correctly

`fetchTopLanguages` accumulated `count` in one variable shared by every language,
so a repeat only counted correctly while a language's repositories arrived together.
Interleaved — HTML, javascript, HTML, javascript —
the second HTML read the counter javascript had just left behind,
and reported 3 repositories instead of 2.
Each language's count and size now come off that language's own entry,
which makes the result independent of the order the repositories are visited in.

`count_weight` multiplies this figure into the size a card sorts and draws by,
and it defaults to 0 — so a default card is unchanged,
and only one passing `count_weight` can reorder.

Ported from upstream `github-stats-extended` 92e0185d (#546), which fixes #544.
