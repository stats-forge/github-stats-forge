---
title: Top languages
description: The languages you write most, by bytes of code or by repository count.
---

The card reads the languages of the repositories you own or contribute to and ranks them.
By default it weighs them by size — the bytes GitHub attributes to each language — which is what
the progress bars show.

![The top languages card](/cards/top-langs.svg)

```text
?username=octocat&langs_count=6
```

## Required

| Option     | What it is                             |
| ---------- | -------------------------------------- |
| `username` | The GitHub login to read languages for |

## Layouts

`layout` changes the shape entirely, and is the option worth trying first.

### `compact`

![The top languages card, compact layout](/cards/top-langs-compact.svg)

```text
?username=octocat&layout=compact&langs_count=8
```

One bar across the top, then the languages in two columns. It fits more languages in less height,
which is what makes it the usual pick for a README sidebar.

### `donut`

![The top languages card, donut layout](/cards/top-langs-donut.svg)

```text
?username=octocat&layout=donut&langs_count=6
```

`donut-vertical` stacks the legend under the ring instead of beside it,
and `pie` fills the ring in.

## Weighting

Two languages can rank differently depending on what you mean by "most".
`size_weight` and `count_weight` set that:

| Weights                        | What it ranks by                       |
| ------------------------------ | -------------------------------------- |
| `size_weight=1&count_weight=0` | Bytes of code — the default            |
| `size_weight=0&count_weight=1` | How many repositories use the language |
| `size_weight=1&count_weight=1` | Both, multiplied together              |

## Options

| Option               | Values                                            | What it does                              |
| -------------------- | ------------------------------------------------- | ----------------------------------------- |
| `layout`             | `normal` `compact` `donut` `donut-vertical` `pie` | The shape of the card                     |
| `langs_count`        | a number                                          | How many languages to show                |
| `hide`               | language names                                    | Languages to leave out                    |
| `exclude_repo`       | repository names                                  | Repositories to leave out                 |
| `size_weight`        | a number                                          | Weight given to a language's size         |
| `count_weight`       | a number                                          | Weight given to its repository count      |
| `stats_format`       | `percentages` `bytes`                             | What the value beside each language reads |
| `hide_progress`      | `true` `false`                                    | Drop the bars and keep the names          |
| `hide_values`        | `true` `false`                                    | Drop the numbers                          |
| `prog_bar_bg_color`  | a hex color                                       | The unfilled part of each bar             |
| `role`               | `OWNER` `COLLABORATOR` `ORGANIZATION_MEMBER`      | Which repositories count                  |
| `disable_animations` | `true` `false`                                    | Draw the card with no animation           |

Plus the [common options](../../customization/common-options/) every card takes,
and `locale`.
