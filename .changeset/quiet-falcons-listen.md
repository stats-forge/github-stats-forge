---
'@stats-forge/github-stats-server': minor
'@stats-forge/github-stats-forge-cli': patch
---

docs: keep the GitHub token off the command line

Every `docker run` example uses `--env-file` instead of `-e PAT_1=github_pat_...`,
and self-hosting gained a "Where the token lives" section: env files, Compose,
a secret manager and a KMS-backed Kubernetes Secret.
