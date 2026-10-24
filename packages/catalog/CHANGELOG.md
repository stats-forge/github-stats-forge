# @stats-forge/github-stats-forge-catalog

## 0.2.0

### Minor Changes

- [#295](https://github.com/stats-forge/github-stats-forge/pull/295) [`20ec447`](https://github.com/stats-forge/github-stats-forge/commit/20ec447ab6537555b853d48cd9ddb041d45d7dbf) - feat: add `notebooks=code` to the top-languages card, counting notebooks' code cells as their kernel's language

### Patch Changes

- Updated dependencies [[`20ec447`](https://github.com/stats-forge/github-stats-forge/commit/20ec447ab6537555b853d48cd9ddb041d45d7dbf)]:
  - @stats-forge/github-stats-forge-core@0.11.0

## 0.1.4

### Patch Changes

- Updated dependencies [[`2e48bfd`](https://github.com/stats-forge/github-stats-forge/commit/2e48bfd7d8056c7e6f9440c8e9c3e9f87ad5676e), [`27d572d`](https://github.com/stats-forge/github-stats-forge/commit/27d572df10b7a92ddc05ebd653cf6e9ca4ca9e2f), [`6de4809`](https://github.com/stats-forge/github-stats-forge/commit/6de4809d0ff10b8db279b228327fca606abf9664), [`52a093b`](https://github.com/stats-forge/github-stats-forge/commit/52a093b7e05f926593b432d8c671f974c235f160), [`c4f3f00`](https://github.com/stats-forge/github-stats-forge/commit/c4f3f007cc1e30e770828f4af7cca462baf8d482), [`002e2bc`](https://github.com/stats-forge/github-stats-forge/commit/002e2bce4e4b8fff8a2f62a6d327e45e1de620a5), [`8a23daf`](https://github.com/stats-forge/github-stats-forge/commit/8a23daf3e805b1ed0c456267db262aa4bd918f01), [`73db019`](https://github.com/stats-forge/github-stats-forge/commit/73db01923b9ded6c13fd422d5ff13c77dede1e21), [`de87c16`](https://github.com/stats-forge/github-stats-forge/commit/de87c16f5b83d1aabd1c435392bf59481548a0df), [`941efec`](https://github.com/stats-forge/github-stats-forge/commit/941efec1e355dd95fe27fca99f8a6443cf65d736)]:
  - @stats-forge/github-stats-forge-core@0.10.0

## 0.1.3

### Patch Changes

- Updated dependencies [[`9510a7e`](https://github.com/stats-forge/github-stats-forge/commit/9510a7eaeb1729f854d30721134c8a3f49d4472d)]:
  - @stats-forge/github-stats-forge-core@0.9.0

## 0.1.2

### Patch Changes

- [#191](https://github.com/stats-forge/github-stats-forge/pull/191) [`c6b11a7`](https://github.com/stats-forge/github-stats-forge/commit/c6b11a7c72768fef8131852bcc2e585dc536b26a) - feat: let the gist card's animation be turned off

  `disable_animations=true` stops the fade-in, as it already does on the other cards.
  The card animates by default, which is what it did before.

- [#189](https://github.com/stats-forge/github-stats-forge/pull/189) [`d88e40e`](https://github.com/stats-forge/github-stats-forge/commit/d88e40ee2c2fe5de24e5aa8b4df69d2769882e33) - feat: animate the repository pin card, and let disable_animations stop it

  The card was drawn without animation and nothing could change that. It now behaves like
  every other card: the fade-in plays by default, and `disable_animations=true` turns it off.

- Updated dependencies [[`c6b11a7`](https://github.com/stats-forge/github-stats-forge/commit/c6b11a7c72768fef8131852bcc2e585dc536b26a), [`3221247`](https://github.com/stats-forge/github-stats-forge/commit/322124755f4950ef0e9517f907e8f6bc89d3a7e8), [`d88e40e`](https://github.com/stats-forge/github-stats-forge/commit/d88e40ee2c2fe5de24e5aa8b4df69d2769882e33)]:
  - @stats-forge/github-stats-forge-core@0.8.3

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
