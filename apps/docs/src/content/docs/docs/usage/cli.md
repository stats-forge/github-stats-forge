---
title: The CLI
description: Render a card to a local SVG file, one prompt at a time.
---

```sh
npx @stats-forge/github-stats-forge-cli
```

The CLI asks which card you want, asks for the options that card needs, renders it, and leaves the
menu open so you can change one thing and look again. Every card on this site was made with it.

It is how you settle on a card. To keep one current in a repository afterwards, hand the options you
arrived at to [the GitHub Stats Forge action](https://github.com/stats-forge/github-stats-forge-action), which is the recommended way to draw them
and takes the same query string.

## A token

Every card but WakaTime reads the GitHub API, which needs a personal access token.
A classic token with no scopes at all is enough — the cards only read public data.

The CLI looks for one in this order:

1. `--pat <token>`, repeatable, when you want to pass it explicitly.
2. `PAT_1`, `PAT_2`, … in the environment.
3. `PAT_1` in a `.env` file next to you, or the one `--env-file` names.
4. A prompt, if it still has none.

Several tokens are not redundancy for its own sake: a card that exhausts one moves to the next,
which matters for the stats card, whose extra stats each cost a request.

## Flags

| Flag                | What it does                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `-c, --card <id>`   | Skip the first prompt: `stats`, `top-langs`, `pin`, `contributed-to`, `gist`, `wakatime` |
| `-o, --out <file>`  | Where to write the SVG; the default is named after the card and its subject              |
| `--config <file>`   | A saved card to load, and where "Save these options" writes                              |
| `-g, --generate`    | Render what `--config` holds and exit, without opening the menu                          |
| `--pat <token>`     | A GitHub token; repeat the flag for several                                              |
| `--env-file <file>` | Which env file to read `PAT_1`, `PAT_2`, … from                                          |
| `-h, --help`        | The same list, from the tool                                                             |

## Saving a card

The menu can write what you answered to a file:

```json
{
  "card": "stats",
  "options": {
    "username": "octocat",
    "show_icons": "true",
    "theme": "tokyonight"
  }
}
```

It is a query string in JSON — every value a string, exactly as the endpoint receives it — so it
reads like the URL it stands for and survives being edited by hand.

Load it again with `--config`, and the menu opens on those answers.
Add `--generate` and it renders and exits, which is what a script or a scheduled job wants:

```sh
npx @stats-forge/github-stats-forge-cli --config card.json --generate --out stats.svg
```

## In a README

The output is a plain SVG file. Commit it and reference it like any other image:

```md
![My GitHub stats](./stats.svg)
```

See [In a README](../in-your-readme/) for a light and dark pair, two cards side by
side, and a workflow that redraws them on a schedule.
