---
'@stats-forge/github-stats-forge-cli': patch
---

fix: point the bin at a committed shim, so a clean install can link it

`bin` named `build/index.js`, which does not exist until the package is built —
so pnpm warned on every clean install of the workspace,
once for each app that depends on the CLI, and created no bin link.
It now names `bin.js`, three committed lines that import the built entry point.
