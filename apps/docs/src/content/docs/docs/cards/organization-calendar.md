---
title: Organization calendar
description: An organization's last two months, week by week.
---

A row of an organization's weeks, each as hot as it was busy, under the total they add up to.
It counts merged pull requests unless told otherwise.
![The organization calendar card](/cards/org-calendar.svg)

```text
?org=forge-guild
```

## Required

| Option | What it is                                                |
| ------ | --------------------------------------------------------- |
| `org`  | The organization's login — the name in `github.com/<org>` |

## Options

| Option  | Values                                                    | What it does                        |
| ------- | --------------------------------------------------------- | ----------------------------------- |
| `count` | `prs_merged` `prs_opened` `issues_opened` `issues_closed` | What each week counts               |
| `weeks` | `1` to `9`                                                | Weeks the row covers (9 by default) |

Plus the [common options](../../customization/common-options/), `number_format` and
`number_precision`.

## The weeks

Each cell is seven days, the newest ending today, all in UTC. The dates under the row are the first
day of the oldest week and the last day of the newest.

## How hot a week is

A week's heat is its count against the busiest week's, in four steps: a week with half the busiest
week's count is two steps up. An empty week shows the track. The steps are relative, so one card's
hottest week says nothing about another's.

## Why weekly

GitHub keeps a contribution calendar for people, not for organizations, so this one is a search per
week. Every week rides on one request and one rate-limit point, and each search adds to the time
GitHub takes to answer it: past about four months, a busy organization's request outlasts GitHub's
own ten-second limit and fails, so the card stops at two months to keep well clear of it. A calendar of days would need several requests for the same span.

## The token it needs

The issue counts need a token that can read **issues**; see
[the organization cards](../../usage/tokens/#the-organization-cards). Without it, GitHub answers
with pull requests, and the card draws an error rather than counting them as issues.
