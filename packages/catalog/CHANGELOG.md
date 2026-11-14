# @stats-forge/github-stats-forge-catalog

## 0.6.0

### Minor Changes

- [#440](https://github.com/stats-forge/github-stats-forge/pull/440) [`7a32f88`](https://github.com/stats-forge/github-stats-forge/commit/7a32f882298b0dfd5af68bf7d8ccfea48fb89d06) - feat: lay the stats card's rows out in two columns with `layout=columns`

- [#441](https://github.com/stats-forge/github-stats-forge/pull/441) [`6317c5b`](https://github.com/stats-forge/github-stats-forge/commit/6317c5b342a470ceeceff9bd5b43561f097e5ba1) - feat: pick the WakaTime card's window with `range`, from the last 7 days to all time

### Patch Changes

- [#459](https://github.com/stats-forge/github-stats-forge/pull/459) [`9d3dce9`](https://github.com/stats-forge/github-stats-forge/commit/9d3dce962ce277f6a6b4d9102c36d26a55f0745a) - fix: rename the source export condition to `@github-stats-forge/source`, so another workspace's `@stats/source` no longer loads TypeScript from `node_modules`
- Updated dependencies [[`9d3dce9`](https://github.com/stats-forge/github-stats-forge/commit/9d3dce962ce277f6a6b4d9102c36d26a55f0745a), [`7a32f88`](https://github.com/stats-forge/github-stats-forge/commit/7a32f882298b0dfd5af68bf7d8ccfea48fb89d06), [`6317c5b`](https://github.com/stats-forge/github-stats-forge/commit/6317c5b342a470ceeceff9bd5b43561f097e5ba1)]:
  - @stats-forge/github-stats-forge-core@0.16.0

## 0.5.0

### Minor Changes

- [#408](https://github.com/stats-forge/github-stats-forge/pull/408) [`f715ce6`](https://github.com/stats-forge/github-stats-forge/commit/f715ce6759885dd9fa8d737d0c1ac3c9dc383b91) - feat: offer `locale` as a list of the available codes, so the CLI and the anvil let you pick one

### Patch Changes

- Updated dependencies [[`5ba3ff1`](https://github.com/stats-forge/github-stats-forge/commit/5ba3ff124dd01062c7cc9c5da0e10864b7b3a40a), [`dc85246`](https://github.com/stats-forge/github-stats-forge/commit/dc85246905fbf45eb29cbea47cb21b77593cc820), [`4cbfe57`](https://github.com/stats-forge/github-stats-forge/commit/4cbfe575879002c87abd3b030e583d6fdfa23740), [`fe8ca32`](https://github.com/stats-forge/github-stats-forge/commit/fe8ca325e24f0bb048ef58d7d1d03499901c53ed), [`f715ce6`](https://github.com/stats-forge/github-stats-forge/commit/f715ce6759885dd9fa8d737d0c1ac3c9dc383b91), [`2cedfe9`](https://github.com/stats-forge/github-stats-forge/commit/2cedfe9d01f8ac3ef4d3ae0aaa146a4db9d68350), [`6f5c961`](https://github.com/stats-forge/github-stats-forge/commit/6f5c961b298ec38f45068ff96599f9999795c2f2), [`a95c354`](https://github.com/stats-forge/github-stats-forge/commit/a95c35429afca317e35352f5ef9fca671a31872e), [`b1fd694`](https://github.com/stats-forge/github-stats-forge/commit/b1fd6944f3b09368d73d2cecdec9c1ad934e9243), [`f9294f4`](https://github.com/stats-forge/github-stats-forge/commit/f9294f4d0b9d4cb6fa5308161519c135f354b4ef), [`32167b8`](https://github.com/stats-forge/github-stats-forge/commit/32167b8222e791af72a429828045ff05c2de4f39), [`7ab691c`](https://github.com/stats-forge/github-stats-forge/commit/7ab691cd7f579968a3c7b77fa8eb241e2acbbc90), [`21b9e5d`](https://github.com/stats-forge/github-stats-forge/commit/21b9e5d0fe1240c3c4d68445c7a6441c5320b66f), [`612b602`](https://github.com/stats-forge/github-stats-forge/commit/612b6029aabbc48fa74c9f808be5c0a531040568), [`cbddc81`](https://github.com/stats-forge/github-stats-forge/commit/cbddc812b2f4e3bbf07b422fb344b57513ae4127)]:
  - @stats-forge/github-stats-forge-core@0.15.0

## 0.4.1

### Patch Changes

- Updated dependencies [[`1fb82fa`](https://github.com/stats-forge/github-stats-forge/commit/1fb82faad5e9eb1a0214b055b5d5e2e50df71334), [`1fb82fa`](https://github.com/stats-forge/github-stats-forge/commit/1fb82faad5e9eb1a0214b055b5d5e2e50df71334), [`9a9519f`](https://github.com/stats-forge/github-stats-forge/commit/9a9519f00ddde15fe216d7b8cdd98ec84cc7d78d), [`1fb82fa`](https://github.com/stats-forge/github-stats-forge/commit/1fb82faad5e9eb1a0214b055b5d5e2e50df71334)]:
  - @stats-forge/github-stats-forge-core@0.14.0

## 0.4.0

### Minor Changes

- [#373](https://github.com/stats-forge/github-stats-forge/pull/373) [`073f306`](https://github.com/stats-forge/github-stats-forge/commit/073f306a273a0520c0c5e7667ea083240531294e) - feat: add the organization calendar card, an organization's weeks as a row of heat, at `/api/org-calendar`

- [#366](https://github.com/stats-forge/github-stats-forge/pull/366) [`8505a70`](https://github.com/stats-forge/github-stats-forge/commit/8505a7032c39c7ddc9a4c693ae077b0a80c45229) - feat!: take one theme, or a `light,dark` pair, as the only color option

  The color params and `theme_light`/`theme_dark` are gone: a pair such as `theme=ember_light,ember_dark`, the default, follows the viewer's color scheme. Adds `github_light`, `github_dark` and `github_dark_dimmed`.

### Patch Changes

- Updated dependencies [[`cf8d0fc`](https://github.com/stats-forge/github-stats-forge/commit/cf8d0fc91b38bc87e3e1d78598b7be07b119dd18), [`6ca61f0`](https://github.com/stats-forge/github-stats-forge/commit/6ca61f02a547aa61ce0dc0b2896a5abf1ab65db7), [`4483168`](https://github.com/stats-forge/github-stats-forge/commit/4483168f9d1c4b22794e53f975ef0bbb1fbd1146), [`073f306`](https://github.com/stats-forge/github-stats-forge/commit/073f306a273a0520c0c5e7667ea083240531294e), [`83e9051`](https://github.com/stats-forge/github-stats-forge/commit/83e9051a52b44aed5f839898d834daa6750efb4b), [`bf43ee1`](https://github.com/stats-forge/github-stats-forge/commit/bf43ee145a9f49ad09f07cf60be901ac4bed4d38), [`bf43ee1`](https://github.com/stats-forge/github-stats-forge/commit/bf43ee145a9f49ad09f07cf60be901ac4bed4d38), [`8505a70`](https://github.com/stats-forge/github-stats-forge/commit/8505a7032c39c7ddc9a4c693ae077b0a80c45229), [`bf43ee1`](https://github.com/stats-forge/github-stats-forge/commit/bf43ee145a9f49ad09f07cf60be901ac4bed4d38), [`202c1c9`](https://github.com/stats-forge/github-stats-forge/commit/202c1c9f55ed0ebe1c1248fa21487212adb10b00), [`83e9051`](https://github.com/stats-forge/github-stats-forge/commit/83e9051a52b44aed5f839898d834daa6750efb4b)]:
  - @stats-forge/github-stats-forge-core@0.13.0

## 0.3.0

### Minor Changes

- [#347](https://github.com/stats-forge/github-stats-forge/pull/347) [`8c10c7a`](https://github.com/stats-forge/github-stats-forge/commit/8c10c7a3e578b06dc7d298c11946ccb1e08a6587) - fix: name a card's files `<answers>-<card>`, as the site does, so a pin names its owner and two organizations' cards no longer share one file

- [#350](https://github.com/stats-forge/github-stats-forge/pull/350) [`fd75afe`](https://github.com/stats-forge/github-stats-forge/commit/fd75afe99745f103944270adead9bbd92d82849e) - refactor!: read each option's kind and choices from core
  `COMMON_OPTIONS` is no longer exported; read each card's options, shared ones included, off `cards`.

### Patch Changes

- Updated dependencies [[`5800e80`](https://github.com/stats-forge/github-stats-forge/commit/5800e800cf67c2581c0714ae78e482fe1dbf5eb3), [`15b4c78`](https://github.com/stats-forge/github-stats-forge/commit/15b4c7871a5853e8555e05104c77b56d94a9f7c5), [`2b679cd`](https://github.com/stats-forge/github-stats-forge/commit/2b679cda913442276971a6d6e95171e3b6261602), [`a9e2d2c`](https://github.com/stats-forge/github-stats-forge/commit/a9e2d2cf2e2b2c50e854c767c5d88f0f6ca8d449), [`83ad9d9`](https://github.com/stats-forge/github-stats-forge/commit/83ad9d93bdc3f9384480b48e3a437c8494af924d), [`c04009c`](https://github.com/stats-forge/github-stats-forge/commit/c04009cbc7bb3baa8ea3d20e390e42cb75e4e219), [`4fd23e9`](https://github.com/stats-forge/github-stats-forge/commit/4fd23e960a081974c268d4c558044c40a5a78bb4), [`7be6561`](https://github.com/stats-forge/github-stats-forge/commit/7be65615da0d7aecc673a0aca286663597becdbe), [`29b5df9`](https://github.com/stats-forge/github-stats-forge/commit/29b5df94e4ede7cf99748cc94df1b4515bded9d3)]:
  - @stats-forge/github-stats-forge-core@0.12.0

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
