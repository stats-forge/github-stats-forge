---
title: Repository pin card
description: One repository, drawn as a card, so a profile can pin more than six.
---

GitHub lets a profile pin six repositories. This card is one repository as an image,
so a README can show as many as it likes, in whatever order it likes.

![The repository pin card](/cards/pin.svg)

```text
?username=octocat&repo=hello-world&show_owner=true
```

## Required

| Option     | What it is                             |
| ---------- | -------------------------------------- |
| `username` | The owner's GitHub login               |
| `repo`     | The repository name, without the owner |

## Showing more than stars and forks

`show` adds a line under the description, as a comma-separated list:
`prs_authored`, `prs_commented`, `prs_reviewed`, `issues_authored`, `issues_commented`.
Each one is counted for the repository, not for the user.

## Options

| Option                    | Values         | What it does                                                 |
| ------------------------- | -------------- | ------------------------------------------------------------ |
| `show_owner`              | `true` `false` | Put the owner's login above the repository name              |
| `show`                    | the list above | Extra counts to draw                                         |
| `show_icons`              | `true` `false` | Draw an icon beside each count                               |
| `description_lines_count` | a number       | How many lines the description wraps to                      |
| `browser_rendering`       | `true` `false` | Let the browser wrap the description instead of the renderer |
| `number_format`           | `short` `long` | `1.5k` or `1500`                                             |
| `text_bold`               | `true` `false` | Bold the values                                              |
| `line_height`             | a number       | Space between the lines                                      |

Plus the [common options](../../customization/common-options/) every card takes,
and `locale`.

## Wrapping the description

The renderer wraps the description itself and truncates what does not fit, so the card is the same
width everywhere. `browser_rendering=true` hands that job to the browser instead, which reads
better when the description is long and worse when the card sits somewhere narrow.
