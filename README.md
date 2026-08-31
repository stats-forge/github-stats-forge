<div align="center">
  <img src=".github/assets/appIcon.svg" width="100px" alt="GitHub Stats Forge logo" />
  <h1>GitHub Stats Forge</h1>
  <p>Dynamically generate GitHub stats cards for your READMEs.</p>
</div>

GitHub Stats Forge renders GitHub stats as SVG cards: your contribution stats, your
top languages, pinned repositories, gists and WakaTime coding time.

This repository is the library those cards are rendered by. It is what the
[GitHub Action](https://github.com/stats-forge/github-stats-forge-action) runs, and
what any self-hosted endpoint calls.

## Table of Contents

- [Packages](#packages)
- [Usage](#usage)
- [Cards](#cards)
- [Themes](#themes)
- [Development](#development)
- [Acknowledgements](#acknowledgements)
- [Contributing](#contributing)

## Packages

| Package                          | What it is                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------- |
| [`packages/core`](packages/core) | The library: fetchers, card renderers, themes and the query-string api handlers |

## Usage

```sh
pnpm add @stats-forge/github-stats-forge-core
```

Each api handler takes the query params its endpoint accepts and a `CardConfig`
carrying the GitHub tokens, and answers with the rendered card:

```js
import { CardConfig, stats } from "@stats-forge/github-stats-forge-core";

const config = new CardConfig({
  pats: [{ name: "PAT_1", value: process.env.PAT_1 }],
});

const { status, content } = await stats({ username: "anuraghazra" }, config);
// status: "success" | "error - permanent" | "error - temporary"
// content: the card, as SVG
```

The handlers are `stats`, `pin`, `topLangs`, `gist` and `wakatime` — the last of
which reads the WakaTime API and so takes no config. Nothing in the library reads
`process.env`: the host builds the config and passes it in, which is what lets the
same code run in an action, on a server and in a browser.

## Cards

| Card           | Handler    | What it shows                                             |
| -------------- | ---------- | --------------------------------------------------------- |
| Stats          | `stats`    | Commits, PRs, issues, reviews, stars and a rank           |
| Top languages  | `topLangs` | The languages you write most, by size or repository count |
| Repository pin | `pin`      | One repository, so a profile can pin more than six        |
| Gist pin       | `gist`     | One gist                                                  |
| WakaTime       | `wakatime` | Coding time per language                                  |

Every card takes the [common options](packages/core/src/cards/options.ts) — colors,
title, border, theme, locale — plus its own.

## Themes

See [Available Themes](packages/core/src/themes/README.md) for every built-in theme,
or pass explicit colors to override one.

## Development

Run from the repository root:

```sh
pnpm test                   # vitest
pnpm typecheck              # turbo typecheck + the repo scripts
pnpm lint                   # eslint per package
pnpm build:packages         # build packages/*
pnpm generate-theme-readme  # rewrite the Available Themes page
```

## Acknowledgements

This repository continues the work of [github-stats-extended](https://github.com/stats-organization/github-stats-extended),
which is itself based on [github-readme-stats](https://github.com/anuraghazra/github-readme-stats).
Big thanks to [@anuraghazra](https://github.com/anuraghazra), [@avgupta456](https://github.com/avgupta456),
[@rickstaa](https://github.com/rickstaa), [@qwerty541](https://github.com/qwerty541),
[@martin-mfg](https://github.com/martin-mfg) and everyone else who worked on these projects! ❤️

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](.github/CONTRIBUTING.md).
