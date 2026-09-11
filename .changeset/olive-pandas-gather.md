---
'@stats-forge/github-stats-forge-catalog': minor
---

feat: publish the card and option catalog as its own package

Every card's options — the query param, the label, the kind, the choices and the hint —
moved here from the CLI, which had carried them since the first prompt.
Reading them costs core and nothing else now, rather than the six inquirer prompts behind the CLI.
