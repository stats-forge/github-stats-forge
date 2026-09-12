---
'@stats-forge/github-stats-server': minor
---

feat: show a recorded CLI session on the CLI page

The page now opens with a screen capture of the card being built:
the stats card open above the terminal,
the menu picking a theme,
and the card redrawn when it is generated.

`.mp4` joins the static handler's content types,
which answered an unknown extension `application/octet-stream` —
and under `nosniff` the browser refuses that rather than mislabelling it.
