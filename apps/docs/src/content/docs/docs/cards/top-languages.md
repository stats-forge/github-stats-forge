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

When you have more languages than `langs_count`, the rest are drawn as one last row, **Other**,
so each share is a share of all your code rather than of the languages shown.

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

## Jupyter notebooks

GitHub counts a whole `.ipynb` file as Jupyter Notebook, saved outputs included, so one notebook
full of plots can outweigh the language it is written in. Hiding Jupyter Notebook drops those bytes
without giving the code back to Python.

```text
?username=octocat&notebooks=code
```

`notebooks=code` reads the notebooks of each repository GitHub says has some, and counts their
code cells as the kernel's language: Python, R, Julia and so on. Markdown cells and outputs count
for nothing. A cell starting with a `%%` magic such as `%%bash` counts as that language. One whose
body is text, such as `%%latex` or `%%writefile`, counts for nothing, as does one in a language
GitHub's bar leaves out, such as `%%sql`. A kernel the card does not recognize stays Jupyter
Notebook, without its outputs.

The default, `notebooks=github`, keeps GitHub's count, because `code` costs requests on top of the
card's usual one: one per repository to list its notebooks, for at most 10 repositories, and one per
notebook, for at most 25 notebooks. A repository it cannot read in full keeps GitHub's count: one
with more notebooks than are left to read, a notebook over 2 MB or one it cannot download, or a
notebook GitHub leaves out of its count, such as one under `docs/` or marked vendored.

## Options

| Option              | Values                                            | What it does                              |
| ------------------- | ------------------------------------------------- | ----------------------------------------- |
| `layout`            | `normal` `compact` `donut` `donut-vertical` `pie` | The shape of the card                     |
| `langs_count`       | a number                                          | How many languages to name before Other   |
| `hide_langs`        | language names                                    | Languages to leave out                    |
| `exclude_repo`      | `owner/name` or `name`                            | Repositories to leave out                 |
| `size_weight`       | a number                                          | Weight given to a language's size         |
| `count_weight`      | a number                                          | Weight given to its repository count      |
| `value_format`      | `percent` `bytes`                                 | What the value beside each language reads |
| `hide_progress`     | `true` `false`                                    | Drop the bars and keep the names          |
| `hide_values`       | `true` `false`                                    | Drop the numbers                          |
| `prog_bar_bg_color` | a hex color                                       | The unfilled part of each bar             |
| `affiliation`       | `OWNER` `COLLABORATOR` `ORGANIZATION_MEMBER`      | Which repositories count                  |
| `notebooks`         | `github` `code`                                   | How notebooks count                       |

Plus the [common options](../../customization/common-options/).
