---
'@stats-forge/github-stats-forge-cli': patch
---

feat!: read and write the card's query string, and flatten the saved card file

`--print-query` and a new `Print the query` action write the options as a query string, which is what the action's `options` input and a hosted card URL both take.
`--options` reads the same form back — bare, with its `?`, or as a whole card URL — and layers over `--config`.

A saved card no longer nests its options under `options`:
every one sits beside `card`, which names the card they belong to, and a `version` says which shape of the file it is.

Files written by earlier versions are not read. If you were relying on files just remove the options wrapper.
