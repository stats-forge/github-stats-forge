---
title: Contributed to card
description: The repositories you contribute to, ranked, and the years you contributed in.
---

The card lists the repositories you have contributed to, most contributions first,
with one mark per year in the range — filled for the years that repository got a contribution.
It is the card for showing work that lives in someone else's repository.

![The contributed-to card](/cards/contributed-to.svg)

```text
?username=octocat&repos_count=5&from=2016
```

## Required

| Option     | What it is                                 |
| ---------- | ------------------------------------------ |
| `username` | The GitHub login to read contributions for |

## The range

`from` and `to` bound the years counted, and both ends are inclusive.
Either can be left out; an open end is filled with the widest range GitHub will answer for.
Each end is written as a year, a month or a day:

```text
?username=octocat&from=2016&to=2024
?username=octocat&from=2024-03-15
```

The year marks along each row come from this range, so narrowing it narrows them.
`hide_years=true` drops them.

## Options

| Option               | Values                          | What it does                                             |
| -------------------- | ------------------------------- | -------------------------------------------------------- |
| `repos_count`        | a number                        | How many repositories to list                            |
| `include_own_repos`  | `true` `false`                  | Count your own repositories too, not only other people's |
| `exclude_repo`       | `owner/name` or `name`          | Repositories to leave out                                |
| `from` / `to`        | `2024`, `2024-03`, `2024-03-15` | The range contributions are counted in                   |
| `hide_years`         | `true` `false`                  | Drop the per-year marks                                  |
| `disable_animations` | `true` `false`                  | Draw the card with no animation                          |

Plus the [common options](../../customization/common-options/) every card takes,
and `locale`.
