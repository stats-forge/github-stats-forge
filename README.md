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

[GitHub Stats Forge](https://stats-forge.github.io/github-stats-forge/) renders GitHub stats as SVG cards:
contribution stats, top languages, repositories contributed to, pinned repositories, gists,
organizations and what they did lately, and WakaTime coding time.
This repository holds the library that renders them, the CLI that writes one to a file,
and the HTTP server that serves them as a container image.
Settle on a card in [the card builder](https://stats-forge.github.io/github-stats-forge/anvil/),
which draws one in your browser from every option it takes.

## Installing

The recommended way is [the GitHub Action](https://github.com/stats-forge/github-stats-forge-action):
it renders your cards in a workflow and commits the SVGs,
so your README points at files in your own repository rather than at a server that has to be up.
The three other ways in:

```sh
npx @stats-forge/github-stats-forge-cli           # draw one locally, to an SVG file
npm install @stats-forge/github-stats-forge-core  # call it from your own code

# serve them yourself; cards.env holds the GitHub token
docker run -p 9000:9000 --env-file cards.env ghcr.io/stats-forge/github-stats-forge-server
```

## Documentation

- [The eight cards](https://stats-forge.github.io/github-stats-forge/docs/cards/stats/) and every option each takes
- [Common options](https://stats-forge.github.io/github-stats-forge/docs/customization/common-options/), [79 themes](https://stats-forge.github.io/github-stats-forge/docs/customization/themes/) and [light and dark mode](https://stats-forge.github.io/github-stats-forge/docs/customization/light-and-dark/)
- [Putting a card in a README](https://stats-forge.github.io/github-stats-forge/docs/usage/in-your-readme/)
- [The CLI](https://stats-forge.github.io/github-stats-forge/docs/usage/cli/), [the library](https://stats-forge.github.io/github-stats-forge/docs/usage/library/) and [self-hosting](https://stats-forge.github.io/github-stats-forge/docs/usage/self-hosting/)
- [The fetchers](https://stats-forge.github.io/github-stats-forge/docs/fetchers/overview/) behind the cards

## Contribute

- [Report a bug or ask for a card](https://github.com/stats-forge/github-stats-forge/issues)
- [CONTRIBUTING.md](.github/CONTRIBUTING.md) has the commands and what to run before opening a pull request
- The workspace is [`packages/core`](packages/core) (the library),
  [`packages/catalog`](packages/catalog) (what each card accepts),
  [`packages/cli`](packages/cli), [`apps/server`](apps/server) (published to GHCR as an image),
  and [`apps/docs`](apps/docs) (the site and the card builder)

## Acknowledgements

This repository continues the work of [github-stats-extended](https://github.com/stats-organization/github-stats-extended),
which is itself based on [github-readme-stats](https://github.com/anuraghazra/github-readme-stats).
Big thanks to [@anuraghazra](https://github.com/anuraghazra), [@avgupta456](https://github.com/avgupta456),
[@rickstaa](https://github.com/rickstaa), [@qwerty541](https://github.com/qwerty541),
[@martin-mfg](https://github.com/martin-mfg),
and everyone else who worked on these projects! ❤️
