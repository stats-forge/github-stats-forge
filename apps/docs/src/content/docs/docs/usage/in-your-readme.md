---
title: In a README
description: Embed a rendered card, give it a light and a dark version, and keep it current.
---

A card is a plain SVG file. Commit it and reference it like any other image:

```md
![My GitHub stats](./cards/stats.svg)
```

That is the whole of it for one card, whatever drew the file: [the action](https://github.com/stats-forge/github-stats-forge-action), which is the
recommended way to keep it drawn, or [the CLI](../cli/). The rest of this page is what people
usually want next.

## Where to keep them

A directory of saved cards beside a directory of rendered ones keeps the two straight:

```
.github/
  cards/
    stats.json        the options, saved by the CLI
    stats.svg         what it rendered
```

The JSON is the card you can edit and re-render; the SVG is what the README points at.
Both belong in the repository — a reader of your profile fetches the SVG, not the CLI.
[The action](https://github.com/stats-forge/github-stats-forge-action) keeps its options in the
workflow instead, so it writes only the SVG.

## Light and dark

GitHub serves READMEs in whichever theme the reader chose, and a card drawn for one looks wrong in
the other. Render it twice, then let the browser pick:

```sh
npx @stats-forge/github-stats-forge-cli --config .github/cards/stats-light.json \
  --generate --out .github/cards/stats-light.svg
npx @stats-forge/github-stats-forge-cli --config .github/cards/stats-dark.json \
  --generate --out .github/cards/stats-dark.svg
```

The two saved cards differ in one option — `"theme": "default"` against `"theme": "dark"` — and
the README picks between them with `<picture>`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./.github/cards/stats-dark.svg" />
  <img alt="My GitHub stats" src="./.github/cards/stats-light.svg" />
</picture>
```

Only the `<img>` needs the `alt`; it is the one a screen reader announces, and the one shown
anywhere `<picture>` is not understood.

This site does the same thing with every card on it, which is why each example changes when you
switch the theme in the header.

That is the recommended way, and there are four others —
[`theme_light` / `theme_dark`](../../customization/light-and-dark/#both-modes-in-one-card) in a
single file, GitHub's `#gh-dark-mode-only` tag, the `transparent` theme, and an alpha channel on
any theme. [Light and dark mode](../../customization/light-and-dark/) weighs them up.

## Two cards side by side

Markdown puts consecutive images on one line if nothing separates them:

```md
![Stats](./cards/stats.svg)![Top languages](./cards/top-langs.svg)
```

That is enough for two cards of the same height. For anything else — differing sizes, links,
centring, a light and dark pair per card — see
[Aligning cards](../../customization/aligning-cards/), which is the whole subject.

## Linking a card

Wrap it, the way any image is linked — a pinned repository card pointing at that repository is
the usual case:

```md
[![rollup-plugin-sass](./cards/pin.svg)](https://github.com/marcalexiei/rollup-plugin-sass)
```

## Keeping it current

A committed SVG holds the numbers from the day it was rendered, so redraw it on a schedule if that
matters. [The GitHub Stats Forge action](https://github.com/stats-forge/github-stats-forge-action)
is the recommended way to do it, one step per card, and its own README has the inputs. This is the
same thing with the CLI, which is what the [contributed to](../../cards/contributed-to/) card still
needs:

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
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
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

`CARDS_TOKEN` is a personal access token with no scopes — the cards read public data only.
The workflow's own `GITHUB_TOKEN` cannot be used for the rendering: it is scoped to this
repository, and a stats card asks about an account.

Pick an interval that matches how fast the numbers move. Daily is more commits than most profiles
justify, and every run spends rate limit.

## If a card looks wrong on GitHub

- **It renders here but not there.** GitHub serves images through a proxy that caches them; a card
  you have just replaced can be the old one for a while. A hard refresh does not clear it — wait,
  or rename the file.
- **The animation does not play.** Some contexts strip it. Render with `disable_animations=true`
  so the card is drawn in its final state rather than its first frame.
- **The text is cut off.** The renderer wraps and truncates to a fixed width. Raise `card_width`,
  or shorten what goes in it — a `custom_title`, fewer `show` entries.
