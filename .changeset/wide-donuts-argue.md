---
'@stats-forge/github-stats-forge-cli': minor
---

feat(cli): group the option menu into sections

Every option now sits under a heading that says what it governs:
what the card counts, what it shows, its text and size, its colors and border.
Generate, save and quit carry a heading of their own above them.
The list is as tall as the terminal, an unanswered option is dimmed,
and typing jumps to a label — `g`, `s` and `q` reach the three actions from anywhere in it.

`CardOption` carries its section as a required `group`;
the params a card cannot render without are `CardField`, which has none.
