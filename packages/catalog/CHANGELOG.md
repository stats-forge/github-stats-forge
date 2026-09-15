# @stats-forge/github-stats-forge-catalog

## 0.1.0

### Minor Changes

- [#126](https://github.com/stats-forge/github-stats-forge/pull/126) [`f255874`](https://github.com/stats-forge/github-stats-forge/commit/f2558741b3b191c972715775cbfec07494966677) - feat: publish the card and option catalog as its own package

  Every card's options — the query param, the label, the kind, the choices and the hint —
  moved here from the CLI, which had carried them since the first prompt.
  Reading them costs core and nothing else now, rather than the six inquirer prompts behind the CLI.
