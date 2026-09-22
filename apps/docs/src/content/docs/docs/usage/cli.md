---
title: The CLI
description: Render a card to a local SVG file, one prompt at a time.
---

```sh
npx @stats-forge/github-stats-forge-cli
```

The CLI asks which card you want, asks for the options that card needs, renders it, and leaves the menu open so you can change one thing and look again.
Every card on this site was made with it.

<!-- demo: cli -->

It is how you settle on a card.
To keep one current in a repository afterwards, hand the options you arrived at to [the GitHub Stats Forge action](https://github.com/stats-forge/github-stats-forge-action),
which is the recommended way to draw them and takes the same query string.

## The menu

Once the card is picked and the answers it cannot render without are in, every other option sits in
one list, under the heading that says what it governs:

| Section           | What sits under it                                                          |
| ----------------- | --------------------------------------------------------------------------- |
| What it counts    | The date range, the scope and the filters — what the figures are drawn from |
| What it shows     | Which stats are drawn, the layout, the icons                                |
| Text and size     | The title, the width, the number format, the locale                         |
| Colors and border | The theme and every color, a card's own ones included                       |

A section none of a card's options fall under is dropped,
so the gist pin counts nothing and has no "What it counts".

The three actions sit above those sections under an "Actions" heading of their own,
so nothing in the menu is unheaded.

Arrow keys move, and typing jumps to the first row whose label starts with what you typed.
That is what keeps the actions one key away however far down the list you are: `g` reaches "Generate the card", `s` "Save these options" and `q` "Quit".
An option nothing has answered reads a dimmed `—`, so what you have set stands out.

## A token

Every card but WakaTime reads the GitHub API, which needs a personal access token.
A classic token with no scopes at all is enough — the cards only read public data.

The CLI looks for one in this order:

1. `--pat <token>`, repeatable, when you want to pass it explicitly.
2. `PAT_1`, `PAT_2`, … in the environment.
3. `PAT_1` in a `.env` file next to you, or the one `--env-file` names.
4. A prompt, if it still has none.

A token spelled out on the command line lands in your shell history, so prefer `--pat "$token"` —
or the env file, the environment, or the prompt, which hides what you type.

Several tokens are not redundancy for its own sake: a card that exhausts one moves to the next,
which matters for the stats card, whose extra stats each cost a request.

## Flags

| Flag                | What it does                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `-c, --card <id>`   | Skip the first prompt: `stats`, `top-langs`, `pin`, `org`, `org-activity`, `contributed-to`, `gist`, `wakatime` |
| `-o, --out <file>`  | Where to write the SVG; the default is named after the card and its subject                                     |
| `--config <file>`   | A saved card to load, and where "Save these options" writes                                                     |
| `--options <query>` | Options as a query string, layered over `--config`                                                              |
| `-g, --generate`    | Render what `--config` holds and exit, without opening the menu                                                 |
| `--print-query`     | Print the options as a query string and exit, without rendering                                                 |
| `--pat <token>`     | A GitHub token; repeat the flag for several                                                                     |
| `--env-file <file>` | Which env file to read `PAT_1`, `PAT_2`, … from                                                                 |
| `-h, --help`        | The same list, from the tool                                                                                    |

## Saving a card

The menu can write what you answered to a file:

```json
{
  "version": 1,
  "card": "stats",
  "username": "octocat",
  "show_icons": "true",
  "theme": "tokyonight"
}
```

It is a query string in JSON — every value a string, exactly as the endpoint receives it — so it
reads like the URL it stands for and survives being edited by hand. `card` says which card the
options belong to, and `version` which shape of the file it is; those two are the only keys that
are not options.

`version` is what lets the format change later without a file becoming a guess: a file naming a
higher number than the CLI knows is refused with a message saying so, rather than rendered from
options it might have read wrong. A file without one is read as version 1.

Load it again with `--config`, and the menu opens on those answers.
Add `--generate` and it renders and exits, which is what a script or a scheduled job wants:

```sh
npx @stats-forge/github-stats-forge-cli --config card.json --generate --out stats.svg
```

## The query string

Every other way of drawing a card takes a query string: [the action](https://github.com/stats-forge/github-stats-forge-action)'s
`options` input, a hosted image URL, the card builder's query box. The CLI reads and writes the
same thing, so a card you settle on here goes straight into a workflow:

```sh
npx @stats-forge/github-stats-forge-cli --config card.json --print-query
```

```text
?username=octocat&show_icons=true&theme=tokyonight
```

Paste that into the action and it draws the card you just tuned:

```yaml
- uses: stats-forge/github-stats-forge-action@02d80bcc244e0050b6208208f57601bc8ed18848 # v0.8.1
  with:
    card: stats
    options: '?username=octocat&show_icons=true&theme=tokyonight'
    path: profile/stats.svg
```

`--print-query` renders nothing, so it needs no token and no terminal — it works in a script.
"Print the query" in the menu does the same for the card you are tuning, and leaves the menu open.

It reads the same form back. `--options` takes a bare query string, one with its `?`, or a whole
card URL to take the query off, so you can bring a card back out of a workflow or a README to
change one thing:

```sh
npx @stats-forge/github-stats-forge-cli --card stats \
  --options '?username=octocat&show_icons=true&theme=tokyonight'
```

Given both, `--options` layers over `--config` rather than replacing it, so one saved card plus one
option is a whole variant:

```sh
npx @stats-forge/github-stats-forge-cli --config card.json --options '?theme=dark' --print-query
```

## In a README

The output is a plain SVG file. Commit it and reference it like any other image:

```md
![My GitHub stats](./stats.svg)
```

See [In a README](../in-your-readme/) for a light and dark pair, two cards side by
side, and a workflow that redraws them on a schedule.
