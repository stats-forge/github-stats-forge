---
'@stats-forge/github-stats-forge-cli': patch
---

build: depend on the inquirer prompts used, not on `@inquirer/prompts`

The meta-package pulled all ten prompts, five of them never imported.
Ten packages leave the install, and nothing about the prompts changes.
