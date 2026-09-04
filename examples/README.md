# Examples

A saved card per file in [`cards/`](cards),
and one command that renders all of them through the CLI:

```sh
pnpm examples                 # build the packages, render every card
pnpm examples stats top-langs # redraw just these two
```

The SVGs land in [`previews/`](previews), next to a generated `README.md` that embeds every one of them, so opening [that folder](previews) shows the whole set at once.
Both are committed, so the cards are visible without rendering anything.
They carry live stats, so they age between runs — which is what `pnpm examples` is for.

## What a file holds

Exactly what the CLI's `--config` loads: the card and its options, every value a string,
so the file reads like the URL it stands for.

```json
{
  "card": "stats",
  "options": {
    "username": "marcalexiei",
    "theme": "tokyonight",
    "show_icons": "true"
  }
}
```

Add a file to `cards/`, and `pnpm examples` picks it up.
To find the options a card takes, run the CLI without a config and walk its menu — `Save these options` writes a file in this shape.

```sh
pnpm --filter ./packages/cli run dev
```

Each example is also a `--config` you can open in that menu:

```sh
node packages/cli/build/index.js --config examples/cards/stats.json
```

## The token

Every card but WakaTime reads the GitHub API, so `PAT_1` has to be in `.env` at the root.
The generator runs the CLI from there, so the file is found without being named.
Pass `--pat` or `--env-file` instead and they are forwarded.

Two of the examples need more than a token:

- `gist` resolves the id against `viewer`, so the gist must belong to the token's own account,
  and the token needs gist read access.
- `wakatime` reads wakatime.com rather than GitHub, and only for a public account — hence `ffflabs`,
  the account upstream demos with.
