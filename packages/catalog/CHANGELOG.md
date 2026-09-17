# @stats-forge/github-stats-forge-catalog

## 0.1.1

### Patch Changes

- [#150](https://github.com/stats-forge/github-stats-forge/pull/150) [`eb463cd`](https://github.com/stats-forge/github-stats-forge/commit/eb463cdbc0b72cd79404561342dea40b8a606ce5) - docs: cut each README to a front door and link the documentation site
- Updated dependencies [[`eb463cd`](https://github.com/stats-forge/github-stats-forge/commit/eb463cdbc0b72cd79404561342dea40b8a606ce5), [`9eefeaa`](https://github.com/stats-forge/github-stats-forge/commit/9eefeaaec3e9c6e68c94ccac117e13331c97a75d), [`a6cca30`](https://github.com/stats-forge/github-stats-forge/commit/a6cca30771fdcd57e701a3ea79981f8c5944120d), [`c16f58e`](https://github.com/stats-forge/github-stats-forge/commit/c16f58ef75b929ab9a190a38a05ef815bfe6e423)]:
  - @stats-forge/github-stats-forge-core@0.8.1

## 0.1.0

### Minor Changes

- [#126](https://github.com/stats-forge/github-stats-forge/pull/126) [`f255874`](https://github.com/stats-forge/github-stats-forge/commit/f2558741b3b191c972715775cbfec07494966677) - feat: publish the card and option catalog as its own package

  Every card's options — the query param, the label, the kind, the choices and the hint —
  moved here from the CLI, which had carried them since the first prompt.
  Reading them costs core and nothing else now, rather than the six inquirer prompts behind the CLI.
