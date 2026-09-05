<div align="center">
  <img src=".github/assets/appIcon.svg" width="100px" alt="GitHub Stats Forge logo" />
  <h1>GitHub Stats Forge</h1>
  <p>Dynamically generate GitHub stats cards for your READMEs.</p>
  <p><a href="https://stats-forge.github.io/github-stats-forge/"><strong>Documentation</strong></a></p>
</div>

GitHub Stats Forge renders GitHub stats as SVG cards: your contribution stats, your top languages,
the repositories you contribute to, pinned repositories, gists and WakaTime coding time.

This repository is the library those cards are rendered by,
and the CLI that renders one to a local file. It is what any self-hosted endpoint calls.

## Getting a card

**The recommended way is [the GitHub Action](https://github.com/stats-forge/github-stats-forge-action)**,
which renders your cards in a workflow and commits the SVGs, so your README points at files in your
own repository rather than at a server that has to be up:

```yaml
- uses: stats-forge/github-stats-forge-action@v0
  with:
    card: stats
    options: '?username=octocat&show_icons=true&theme=dark'
    path: profile/stats.svg
    token: ${{ secrets.STATS_PAT }}
```

To settle on a card first, or to draw one locally:

```sh
npx @stats-forge/github-stats-forge-cli
```

It asks which card you want and which options it should take, and writes the SVG next to you.

To call it from your own code instead — an action of your own, a server, a browser:

```sh
npm install @stats-forge/github-stats-forge-core
```

```js
import { CardConfig, stats } from '@stats-forge/github-stats-forge-core/api';

const config = new CardConfig({ pats: [{ name: 'PAT_1', value: process.env.PAT_1 }] });
const result = await stats({ username: 'octocat' }, config);
```

**Everything else is documented on the site:**
[the six cards and every option each one takes](https://stats-forge.github.io/github-stats-forge/cards/stats/),
[the 79 themes](https://stats-forge.github.io/github-stats-forge/customization/themes/),
[light and dark mode](https://stats-forge.github.io/github-stats-forge/customization/light-and-dark/),
[putting a card in a README](https://stats-forge.github.io/github-stats-forge/usage/in-your-readme/)
and [the fetchers](https://stats-forge.github.io/github-stats-forge/fetchers/overview/).

## What is in here

| Path                             | What it is                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------- |
| [`packages/core`](packages/core) | The library: fetchers, card renderers, themes and the query-string api handlers |
| [`packages/cli`](packages/cli)   | `github-stats-forge`: renders a card to a local SVG, one prompt at a time       |
| [`apps/docs`](apps/docs)         | The documentation site, published from every release                            |

## Development

Run from the repository root:

```sh
pnpm test                   # vitest
pnpm typecheck              # build, then tsc over the packages and the repo scripts
pnpm lint                   # oxlint
pnpm build:packages         # build packages/*
pnpm docs                   # the documentation site's dev server
pnpm docs:cards             # redraw the site's card previews
pnpm check-all              # every check CI runs, cheapest first
```

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) before opening a pull request.

## Acknowledgements

This repository continues the work of [github-stats-extended](https://github.com/stats-organization/github-stats-extended),
which is itself based on [github-readme-stats](https://github.com/anuraghazra/github-readme-stats).

Big thanks to

- [@anuraghazra](https://github.com/anuraghazra)
- [@avgupta456](https://github.com/avgupta456)
- [@rickstaa](https://github.com/rickstaa)
- [@qwerty541](https://github.com/qwerty541)
- [@martin-mfg](https://github.com/martin-mfg)
- Everyone else who worked on these projects! ❤️
