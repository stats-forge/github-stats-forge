---
title: Common options
description: The colors, borders, titles and sizes every card accepts.
---

Every card takes the options on this page, unless a row says otherwise. Each card's page lists
what only that card takes.

A `true` / `false` option can be written alone: `?hide_border` is `?hide_border=true`. Any other
option left empty, such as `?theme=`, is the same as leaving it out. An option given twice is one
list: `?hide=stars&hide=prs` is `?hide=stars,prs`. A value an option does not accept is an error
card naming the parameter, never a silent fallback.

## Colors

| Option         | What it colors                      |
| -------------- | ----------------------------------- |
| `title_color`  | The card's title                    |
| `text_color`   | The body text                       |
| `icon_color`   | The icons, where the card draws any |
| `bg_color`     | The background                      |
| `border_color` | The border                          |

A color is a hex value **without the `#`** — three, four, six or eight digits — or a named CSS
color. `bg_color` also takes a gradient: an angle in degrees, then two or more stops.

```text
?username=octocat&title_color=2f80ed&text_color=434d58&bg_color=45,ff0000,00ff00,0000ff
```

Each color option has a `_light` and a `_dark` twin, as `theme` has `theme_light` and
`theme_dark`, so one card can carry both palettes: see [Light and dark mode](../light-and-dark/).

## Theme

`theme` names one of the [built-in themes](../themes/). A color you pass alongside it wins, so a
theme is a starting point rather than a lock.

## Border, title and size

| Option          | Values         | What it does                                           |
| --------------- | -------------- | ------------------------------------------------------ |
| `hide_border`   | `true` `false` | Draw the card with no border                           |
| `border_radius` | a number       | How round the corners are; `0` is square               |
| `title`         | any text       | Replace the title; not on the repository or gist pin   |
| `hide_title`    | `true` `false` | Leave the title out; not on the repository or gist pin |
| `card_width`    | a whole number | Card width in pixels; not on the gist pin              |

`border_radius` and `card_width` take an optional `px`, so `10px` is `10`.

## Numbers

The stats, repository pin and both organization cards take `number_format` — `short` writes
`1.5k`, `long` writes `1500` — and `number_precision`, `0` to `2`, the decimals kept when abbreviating.

## Locale and animations

`locale` picks the language of a card's own words: see [Locales](../locales/).

`disable_animations=true` draws the card in its final state, for anywhere that replays it on every
scroll or where motion is unwelcome.
