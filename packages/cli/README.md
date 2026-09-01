Render a [GitHub Stats Forge](https://github.com/stats-forge/github-stats-forge) card
to a local SVG file, one prompt at a time.

```sh
npx @stats-forge/github-stats-forge-cli
```

It asks which card you want, then the params that card cannot render without, then
puts you in a menu of every other option it accepts — pick one, answer it, and the
menu comes back with the answer beside it. `Generate the card` writes the SVG.

```
? Which card? Stats — commits, PRs, issues, reviews and a rank
? GitHub username anuraghazra
? Stats — set an option, or generate
❯ Generate the card
  Extra stats to show                    reviews,prs_merged
  Stats to hide                          —
  Show the stat icons                    yes
  Theme                                  tokyonight
```

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
