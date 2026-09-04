---
'@stats-forge/github-stats-forge-core': patch
'@stats-forge/github-stats-forge-cli': patch
---

refactor: import relative modules with their real `.ts` extension

A relative specifier now names the file that exists, and `tsc` rewrites it to `.js` on emit,
so the published JavaScript is unchanged. The declarations keep the `.ts` specifier,
which TypeScript resolves to the sibling `.d.ts`; `attw` and `publint` check it on every CI run.
