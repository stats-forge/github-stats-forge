<div align="center">
  <img src=".github/assets/appIcon.svg" width="100px" alt="GitHub Stats Forge logo" />
  <h1>GitHub Stats Forge</h1>
  <p>Dynamically generate GitHub stats cards for your READMEs.</p>
</div>

GitHub Stats Forge renders GitHub stats as SVG cards: your contribution stats, your
top languages, pinned repositories, gists and WakaTime coding time.

This repository is the library those cards are rendered by, and the CLI that renders one
to a local file. It is what any self-hosted endpoint calls.

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
| [`packages/cli`](packages/cli)   | `github-stats-forge`: renders a card to a local SVG, one prompt at a time       |

## Usage

```sh
pnpm add @stats-forge/github-stats-forge-core
```

Each api handler takes the query params its endpoint accepts and a `CardConfig`
carrying the GitHub tokens, and answers with the rendered card:

```js
import { CardConfig, stats } from '@stats-forge/github-stats-forge-core/api';

const config = new CardConfig({
  pats: [{ name: 'PAT_1', value: process.env.PAT_1 }],
});

const result = await stats({ username: 'anuraghazra' }, config);
// result.status === "success" → result.content is the card, as SVG
// result.status === "error"   → result.error carries the code and the param at
//                              fault, result.retryable whether to try again, and
//                              result.content the error drawn as a card
```

The handlers are `stats`, `pin`, `topLangs`, `gist` and `wakatime`. The last needs no
GitHub token, but still takes the config, since that is what carries the transport every
request goes through. Nothing in the library reads `process.env`: the host builds the
config and passes it in, which is what lets the same code run in an action, on a server
and in a browser.

To render one from the terminal instead, without writing any code:

```sh
npx @stats-forge/github-stats-forge-cli
```

It walks you through the cards and their options, and writes the SVG next to you —
see [`packages/cli`](packages/cli).

## Cards

| Card           | Handler    | What it shows                                             |
| -------------- | ---------- | --------------------------------------------------------- |
| Stats          | `stats`    | Commits, PRs, issues, reviews, stars and a rank           |
| Top languages  | `topLangs` | The languages you write most, by size or repository count |
| Repository pin | `pin`      | One repository, so a profile can pin more than six        |
| Gist pin       | `gist`     | One gist                                                  |
| WakaTime       | `wakatime` | Coding time per language                                  |

Every card takes the [common options](packages/core/src/cards/options.ts) — colors,
title, border, theme, locale — plus its own. A card that only renders a fixed set of
values carries them on its handler, e.g. `topLangs.LAYOUTS` and `stats.RANK_ICONS`.

One of each, rendered: [`examples/previews`](examples/previews).
The saved cards they come from live in [`examples/`](examples),
and `pnpm examples` draws them again.

## Themes

Every built-in theme is defined in
[`packages/core/src/themes/index.ts`](packages/core/src/themes/index.ts) — pass one by
name as `theme`, or pass explicit colors to override it.

## Development

Run from the repository root:

```sh
pnpm test                   # vitest
pnpm typecheck              # turbo typecheck + the repo scripts
pnpm lint                   # oxlint
pnpm build:packages         # build packages/*
pnpm examples               # redraw examples/previews from examples/cards
```

## Acknowledgements

This repository continues the work of [github-stats-extended](https://github.com/stats-organization/github-stats-extended),
which is itself based on [github-readme-stats](https://github.com/anuraghazra/github-readme-stats).
Big thanks to [@anuraghazra](https://github.com/anuraghazra), [@avgupta456](https://github.com/avgupta456),
[@rickstaa](https://github.com/rickstaa), [@qwerty541](https://github.com/qwerty541),
[@martin-mfg](https://github.com/martin-mfg) and everyone else who worked on these projects! ❤️

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](.github/CONTRIBUTING.md).
