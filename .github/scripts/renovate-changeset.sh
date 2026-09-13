#!/bin/sh
# Renovate has no changesets manager, so a documentation upgrade writes its own entry.
# Called from `postUpgradeTasks` in ../renovate.json5 as: <slug> <dep name> <new version>
set -eu

cat > ".changeset/renovate-${1}.md" <<CHANGESET
---
'@stats-forge/github-stats-server': patch
---

docs: pin the ${2} example to ${3}
CHANGESET
