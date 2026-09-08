---
'@stats-forge/github-stats-forge-core': patch
---

refactor(core): draw a card's text through `localize`

A card binds its locale table to the requested locale once and then names each wording
where it draws it — `t.title({ name, apostrophe })`, one function per key, taking exactly
the values that key's wording declares. A key carries no card name in front of it any
more, since the table it belongs to is named at the top of the card rather than at every
call site. The `lastYear` wording, which two cards draw, moves to a table of its own in
`common/`, so no card reads another card's translations. The rendered SVG is unchanged.
