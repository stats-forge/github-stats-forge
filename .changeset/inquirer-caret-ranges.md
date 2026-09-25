---
'@stats-forge/github-stats-forge-cli': patch
---

build: accept any compatible @inquirer release

The six prompt packages were pinned exactly, so a patched release reached an install
only after a release here. A caret lets one in at install time, as core's `zod` already does.
