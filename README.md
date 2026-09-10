<div align="center">
  <img src=".github/assets/appIcon.svg" width="100px" alt="GitHub Stats Forge logo" />
  <h1>GitHub Stats Forge</h1>
  <p>Dynamically generate GitHub stats cards for your READMEs.</p>
  <p>
    <a href="https://stats-forge.github.io/github-stats-forge/"><strong>Documentation</strong></a>
    ·
    <a href="https://stats-forge.github.io/github-stats-forge/anvil/"><strong>Card builder</strong></a>
  </p>
</div>

GitHub Stats Forge renders GitHub stats as SVG cards: your contribution stats, your top languages,
the repositories you contribute to, pinned repositories, gists, organizations and WakaTime coding
time.

This repository holds the library those cards are rendered by,
the CLI that renders one to a local file,
and the HTTP server that serves them, shipped as a container image.

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

To settle on a card first,
[the card builder](https://stats-forge.github.io/github-stats-forge/anvil/) draws one in your
browser from every option it takes, and hands you the file the CLI reads.

To draw one locally —
[documented under the CLI](https://stats-forge.github.io/github-stats-forge/docs/usage/cli/):

```sh
npx @stats-forge/github-stats-forge-cli
```

To call it from your own code —
[documented under the library](https://stats-forge.github.io/github-stats-forge/docs/usage/library/):

```sh
npm install @stats-forge/github-stats-forge-core
```

To serve them yourself, with your own tokens —
[documented under self-hosting](https://stats-forge.github.io/github-stats-forge/docs/usage/self-hosting/):

```sh
docker run -p 9000:9000 -e PAT_1=github_pat_... ghcr.io/stats-forge/github-stats-forge-server
```

The image carries the documentation and the card builder with it,
so an instance documents itself at `http://localhost:9000/`.

**Everything else is on the site:**
[the seven cards and every option each takes](https://stats-forge.github.io/github-stats-forge/docs/cards/stats/),
[the 79 themes](https://stats-forge.github.io/github-stats-forge/docs/customization/themes/),
[light and dark mode](https://stats-forge.github.io/github-stats-forge/docs/customization/light-and-dark/),
[putting a card in a README](https://stats-forge.github.io/github-stats-forge/docs/usage/in-your-readme/)
and [the fetchers](https://stats-forge.github.io/github-stats-forge/docs/fetchers/overview/).

## What is in here

| Path                             | What it is                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------- |
| [`packages/core`](packages/core) | The library: fetchers, card renderers, themes and the query-string api handlers |
| [`packages/cli`](packages/cli)   | `github-stats-forge`: renders a card to a local SVG, one prompt at a time       |
| [`apps/server`](apps/server)     | The HTTP server over those handlers, published to GHCR as a container image     |
| [`apps/docs`](apps/docs)         | The documentation site and the card builder, published from every release       |

## Contributing

[CONTRIBUTING.md](.github/CONTRIBUTING.md) has the commands and what to run before opening a
pull request.

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
