---
title: Common options
description: The colors, borders, titles and sizes every card accepts.
---

Every card takes the options on this page. The ones only one card takes are on that card's page.

## Colors

| Option         | What it colors                      |
| -------------- | ----------------------------------- |
| `title_color`  | The card's title                    |
| `text_color`   | The body text                       |
| `icon_color`   | The icons, where the card draws any |
| `bg_color`     | The background                      |
| `border_color` | The border                          |

A color is a hex value **without the `#`** — three, four, six or eight digits — or a named CSS
color:

```text
?username=octocat&title_color=2f80ed&text_color=434d58&bg_color=fffefe
```

An invalid color is an error rather than a silent fallback:
the card comes back reading `Invalid color input for parameter "title_color"`,
and the response says which parameter was at fault.

### Gradients

`bg_color` also takes a gradient, written as an angle followed by two or more colors:

```text
?username=octocat&bg_color=45,ff0000,00ff00,0000ff
```

The first value is the angle in degrees; everything after it is a stop.

### Light and dark in one card

Each color option has a `_light` and a `_dark` twin — `title_color_light`, `bg_color_dark`, and so
on — and `theme_light` / `theme_dark` do the same for a whole theme. The card then carries both
palettes and follows the reader's colour scheme.

See [Light and dark mode](../light-and-dark/) for that and the four other ways to handle it,
and for what wins over what.

## Theme

`theme` names one of the [79 built-in themes](../themes/).
An unknown name falls back to `default` rather than failing, and any explicit color you pass
alongside it wins, so a theme is a starting point rather than a lock.

## Border, title and size

| Option          | Values         | What it does                             |
| --------------- | -------------- | ---------------------------------------- |
| `hide_border`   | `true` `false` | Draw the card with no border             |
| `border_radius` | a number       | How round the corners are; `0` is square |
| `hide_title`    | `true` `false` | Leave the title out                      |
| `custom_title`  | any text       | Replace the title                        |
| `card_width`    | a number       | Card width in pixels                     |

`border_radius` is read the way CSS reads it, so `10px` and `10` are the same thing.
A value that is not a number at all is an error naming the parameter.

## Locale

`locale` picks the language a card's own words are drawn in — its title, its labels, its empty
states and the description an assistive reader gets. See [Locales](../locales/) for the list and
for what happens to a string that has not been translated yet.

Only the cards that draw text take it, which today is all six.

## Numbers

Cards that draw counts take `number_format`: `short` writes `1.5k`, `long` writes `1500`.
Anything else reads as `short`.
The stats card additionally takes `number_precision`, the decimals kept when abbreviating.

## Animations

`disable_animations=true` renders the card with its animations stripped.
Worth setting where the card is embedded somewhere that replays it on every scroll,
or for a reader who would rather nothing moved.
