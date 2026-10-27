---
title: In a README
description: Embed a rendered card, give it a light and a dark version, and keep it current.
---

A card is a plain SVG file. Commit it and reference it like any other image:

```md
![My GitHub stats](./cards/stats.svg)
```

That is the whole of it for one card, whether [the action](https://github.com/stats-forge/github-stats-forge-action) or [the CLI](../cli/) drew the file. The rest of this page is what people
usually want next.

## Where to keep them

A directory of saved cards beside a directory of rendered ones keeps the two straight:

```
.github/
  cards/
    stats.json        the options, saved by the CLI
    stats.svg         what it rendered
```

The JSON is what you edit and re-render; the SVG is what the README points at. Both belong in the
repository. [The action](https://github.com/stats-forge/github-stats-forge-action) keeps its
options in the workflow instead, so it writes only the SVG.

## Light and dark

A card drawn for one GitHub theme looks wrong in the other. Render it twice, from two
[saved cards](../cli/#saving-a-card) that differ only in `theme`, and let `<picture>` pick:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./.github/cards/stats-dark.svg" />
  <img alt="My GitHub stats" src="./.github/cards/stats-light.svg" />
</picture>
```

That is the recommended way; [Light and dark mode](../../customization/light-and-dark/) weighs it
against the four others, such as both palettes in a single file.

## Two cards side by side

Markdown puts consecutive images on one line if nothing separates them:

```md
![Stats](./cards/stats.svg)![Top languages](./cards/top-langs.svg)
```

That is enough for two cards of the same height. For anything else, see
[Aligning cards](../../customization/aligning-cards/).

## Linking a card

Wrap it, as any image is linked:

```md
[![quench](./cards/pin.svg)](https://github.com/ember-smith/quench)
```

## Keeping it current

A committed SVG holds the numbers from the day it was rendered, so redraw it on a schedule.
[The GitHub Stats Forge action](https://github.com/stats-forge/github-stats-forge-action) is the
recommended way, one step per card. This is the same with the CLI, which the
[contributed to](../../cards/contributed-to/) card still needs:

```yaml
name: Refresh cards

on:
  schedule:
    - cron: '0 6 * * 1' # Mondays, 06:00 UTC
  workflow_dispatch:

permissions:
  contents: write

jobs:
  cards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 24

      - name: Render
        env:
          PAT_1: ${{ secrets.CARDS_TOKEN }}
        run: |
          npx @stats-forge/github-stats-forge-cli \
            --config .github/cards/stats.json --generate --out .github/cards/stats.svg

      - name: Commit if anything changed
        run: |
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git add .github/cards
          git diff --quiet --cached || git commit -m 'chore: refresh cards'
          git push
```

Each `uses:` names a commit, since a tag can be moved; take a newer one from each action's
releases page when you copy this. `CARDS_TOKEN` is a repository secret holding a
[GitHub token](../tokens/). Weekly suits most profiles: every run is a commit and spends rate
limit.

## If a card looks wrong

See [Troubleshooting](../troubleshooting/) for an error card, a stale image on GitHub, or text
that is cut off.
