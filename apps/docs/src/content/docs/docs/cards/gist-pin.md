---
title: Gist pin
description: One gist, drawn as a card.
---

The same idea as the [repository pin](../repo-pin/), for a gist:
its first file's name, its description, its language, and its stars and forks.

![The gist pin card](/cards/gist.svg)

```text
?id=0a5c3e9f7d2b4e6a8c1f0b9d7e5a3c21&show_owner=true
```

## Required

| Option | What it is                                          |
| ------ | --------------------------------------------------- |
| `id`   | The gist id — the hash at the end of the gist's URL |

## Options

| Option       | Values         | What it does                              |
| ------------ | -------------- | ----------------------------------------- |
| `show_owner` | `true` `false` | Put the owner's login above the gist name |

Plus the [common options](../../customization/common-options/).

Its default theme is `default_repocard`, which differs from `default` only in the icon color.
