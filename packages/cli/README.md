# @stats-forge/github-stats-forge-cli

Render a [GitHub Stats Forge](https://stats-forge.github.io/github-stats-forge/) card to a local
SVG file, one prompt at a time.

```sh
npx @stats-forge/github-stats-forge-cli
```

or keep it around as `github-stats-forge`:

```sh
npm install -g @stats-forge/github-stats-forge-cli
```

It asks which card you want, then the options that card cannot render without, then puts you in a
menu of every other option it accepts — pick one, answer it, and the menu comes back with the
answer beside it. `Generate the card` writes the SVG, and the menu stays open, so tuning a card is:
generate, look at it, change one option, generate again.

```
? Which card? Stats — commits, PRs, issues, reviews and a rank
? GitHub username anuraghazra
? Stats — wrote stats-anuraghazra.svg — edit an option and generate again
❯ Generate the card
  Quit
  Extra stats to show                    reviews,prs_merged
  Stats to hide                          —
  Show the stat icons                    yes
  Theme                                  tokyonight
```

Every card but WakaTime reads the GitHub API, so it needs a personal access token — from
`--pat "$token"`, from `PAT_1` in the environment or a `.env` file, or typed when asked.

> [!WARNING]
> A token spelled out on the command line lands in your shell history.
> The env file, the environment and the prompt do not.

Requires Node `^24 || >=26`. `--help` prints the flags.

> [!TIP]
> **[The CLI](https://stats-forge.github.io/github-stats-forge/docs/usage/cli/)** documents the menu, the flags,
> the token, saving a card and the query string it shares with the action.
> [Every card](https://stats-forge.github.io/github-stats-forge/docs/) has a page of its own, and
> [the card builder](https://stats-forge.github.io/github-stats-forge/anvil/) draws one in your browser.
