---
title: Common options
description: The theme, borders, titles and sizes every card accepts.
---

Every card takes the options on this page, unless a row says otherwise. Each card's page lists
what only that card takes.

A `true` / `false` option can be written alone: `?hide_border` is `?hide_border=true`. Any other
option left empty, such as `?theme=`, is the same as leaving it out. An option given twice is one
list: `?hide=stars&hide=prs` is `?hide=stars,prs`. A value an option does not accept is an error
card naming the parameter, never a silent fallback.

## Theme

`theme` names one of the [built-in themes](../themes/), which sets every color on the card. One
name, such as `cobalt_dark`, is one look in both modes; a pair, such as `brass_light,magma_dark`,
gives light and dark mode a theme each. With no theme, a card wears `ember_light,ember_dark`. See
[Light and dark mode](../light-and-dark/).

There are no options for single colors: a theme always draws the whole card.

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
