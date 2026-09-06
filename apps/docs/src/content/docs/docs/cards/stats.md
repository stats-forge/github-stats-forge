---
title: Stats card
description: Commits, pull requests, issues, reviews, stars and a rank, for one GitHub user.
---

The card counts five things by default — stars earned, commits, pull requests, issues and the
repositories contributed to — and grades them into a rank from `C` to `S`.
Anything else it can show is opt-in through [`show`](#showing-more-stats).

![The stats card for a GitHub user](/cards/stats.svg)

```text
?username=octocat&show_icons=true
```

## Required

| Option     | What it is                         |
| ---------- | ---------------------------------- |
| `username` | The GitHub login to draw stats for |

## Showing more stats

`show` takes a comma-separated list. Each value adds a line to the card:

![The stats card with extra stats and a percentile rank](/cards/stats-show.svg)

```text
?username=octocat&show_icons=true&show=reviews,prs_merged,contributions&rank_icon=percentile
```

| Value                   | The line it adds                               |
| ----------------------- | ---------------------------------------------- |
| `reviews`               | Pull requests reviewed                         |
| `prs_merged`            | Pull requests merged                           |
| `prs_merged_percentage` | What share of your PRs were merged             |
| `discussions_started`   | Discussions started                            |
| `discussions_answered`  | Discussions answered                           |
| `prs_authored`          | Pull requests authored                         |
| `prs_commented`         | Pull requests commented on                     |
| `prs_reviewed`          | Pull requests reviewed, counted by search      |
| `issues_authored`       | Issues authored                                |
| `issues_commented`      | Issues commented on                            |
| `contributions`         | Contributions in the counted range             |
| `all_time_contribs`     | Contributions across every year of the account |

Each extra stat costs another request, so a card asking for all twelve is slower than one asking
for none.

## Hiding the default stats

`hide` takes the same shape, and removes a line the card would otherwise draw:
`stars`, `commits`, `prs`, `issues`, `contribs`.

## Options

| Option                       | Values                                       | What it does                                            |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| `show`                       | the list above                               | Extra stats to draw                                     |
| `hide`                       | `stars` `commits` `prs` `issues` `contribs`  | Default stats to leave out                              |
| `show_icons`                 | `true` `false`                               | Draw an icon beside each stat                           |
| `hide_rank`                  | `true` `false`                               | Leave out the rank circle                               |
| `rank_icon`                  | `default` `github` `percentile`              | What the rank circle shows                              |
| `ring_color`                 | a hex color                                  | The rank ring, when it should differ from the title     |
| `include_all_commits`        | `true` `false`                               | Count commits of all time rather than the counted range |
| `from` / `to`                | `2024`, `2024-03`, `2024-03-15`              | The range commits and contributions are counted in      |
| `exclude_repo`               | repository names                             | Repositories to leave out of the totals                 |
| `repo`                       | `owner/name` or `name`                       | Scope the search-based stats to these repositories      |
| `owner`                      | logins                                       | Scope the search-based stats to these owners            |
| `role`                       | `OWNER` `COLLABORATOR` `ORGANIZATION_MEMBER` | Which repositories count towards the stats              |
| `contribs_include_own_repos` | `true` `false`                               | Count contributions to your own repositories            |
| `number_format`              | `short` `long`                               | `1.5k` or `1500`                                        |
| `number_precision`           | a number                                     | Decimals kept when abbreviating                         |
| `text_bold`                  | `true` `false`                               | Bold the stat values                                    |
| `line_height`                | a number                                     | Space between the lines                                 |
| `disable_animations`         | `true` `false`                               | Draw the card with no animation                         |

Plus the [common options](../../customization/common-options/) every card takes,
and `locale`.

## The range

`from` and `to` bound what "commits" and "contributions" mean, and both ends are inclusive.
Either may be left out: an open end is filled with the widest range GitHub will answer for.

```text
?username=octocat&from=2020&to=2024
```

`include_all_commits=true` overrides the range for the commit count alone —
it asks for every commit the account has ever made.
