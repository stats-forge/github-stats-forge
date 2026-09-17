#!/bin/sh
# Renovate has no changesets manager, so an upgrade that reaches a published artifact writes its
# own entry. Called from `postUpgradeTasks` in ../renovate.json5 as: <slug> <package dir> <summary>
set -eu

name=$(node -p "require('./${2}/package.json').name")

cat > ".changeset/renovate-${1}.md" <<CHANGESET
---
'${name}': patch
---

${3}
CHANGESET
