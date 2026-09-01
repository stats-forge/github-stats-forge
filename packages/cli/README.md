Render a [GitHub Stats Forge](https://github.com/stats-forge/github-stats-forge) card
to a local SVG file, one prompt at a time.

```sh
npx @stats-forge/github-stats-forge-cli
```

It asks which card you want, then the params that card cannot render without, then
puts you in a menu of every other option it accepts — pick one, answer it, and the
menu comes back with the answer beside it. `Generate the card` writes the SVG.

The menu stays open afterwards, with every answer still on it and the cursor where
you left it, so tuning a card is: generate, look at it, change one option, generate
again. `Quit` (or Ctrl-C) ends the session.

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

## Saving a card

`Save these options` in the menu writes the card and its params to a JSON file, and
`--config` loads one back:

```sh
stats-forge --config my-stats.json      # picks up where the file left off
```

```json
{
  "card": "stats",
  "params": {
    "username": "anuraghazra",
    "theme": "tokyonight",
    "show_icons": "true"
  }
}
```

The file holds what a query string holds, so it reads like the URL it stands for and
can be edited by hand. Loading one skips both the card prompt and the required
params, landing you straight on the menu — and `--config` doubles as the save target,
so the next `Save these options` writes back to it without asking.

`--generate` skips the menu too, rendering exactly what the file holds:

```sh
stats-forge --config my-stats.json --generate
```

Nothing is asked, so this is the form for a script or a scheduled job — refresh a
card on a cron, or regenerate a directory of them. It exits non-zero if the card
could not be rendered, and needs its token from `--pat`, an env file or the
environment, since there is nobody to ask.

While it fetches, a spinner runs on stderr — so `stats-forge > card.svg` still
pipes only the card, and a CI log gets one line instead of an animation.

## The token

Every card except WakaTime reads the GitHub API, so it needs a personal access token
([how to create one](https://github.com/settings/personal-access-tokens)). It can come
from any of these, in this order:

```sh
stats-forge --pat ghp_yourtoken      # the flag wins
echo "PAT_1=ghp_yourtoken" > .env    # read from ./.env by default
export PAT_1=ghp_yourtoken           # or straight from the environment
```

`PAT_1`, `PAT_2`, … are the names core reads, so an env file you already use with a
self-hosted instance works unchanged. With none of them set, the CLI asks for the
token and hides what you type.

## Options

```
-c, --card <id>       Skip the card prompt: stats, top-langs, pin, gist, wakatime
-o, --out <file>      Where to write the card (default: named after the card)
    --config <file>   Options to load, and where "Save these options" writes
-g, --generate        Render what --config holds and exit, without the menu
    --pat <token>     GitHub token; repeat for several
    --env-file <file> Env file to read PAT_1, PAT_2, … from (default: .env)
-h, --help            Show the help
-v, --version         Show the version
```

A card that cannot be rendered prints why, including the code and the param at
fault, and exits non-zero:

```
Could not render the stats card.
  Something went wrong: Invalid number input for parameter "border_radius"
  code: invalid_param, param: border_radius
```
