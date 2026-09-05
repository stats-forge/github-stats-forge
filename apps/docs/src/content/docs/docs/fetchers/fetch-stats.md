---
title: fetchStats
description: Commits, pull requests, issues, reviews and stars for one user, plus the rank they grade into.
---

The fetcher behind the [stats card](../../cards/stats/), and the most expensive one here:
each of the optional counts is another request, which is why they are flags rather than defaults.

<!-- api: fetchStats -->

## What it costs

The five default numbers come from one GraphQL call. Everything switched on with an `include_*`
flag — merged pull requests, discussions, reviews, the issue and PR searches — is a further
request against the search API, which has its own tighter rate limit.
Ask for what a card draws, nothing more.

## The range

`from` and `to` bound the commits and contributions counted, both ends inclusive.
GitHub answers a contributions query for at most a year at a time, so a wider range is sliced
into one query per calendar year and sent as fields of a single request.

## The rank

`rank` is computed here rather than by GitHub: a percentile over commits, pull requests, issues,
reviews, stars and followers, graded into `C` through `S`. It comes back on the same object,
so a consumer drawing its own card need not reimplement it.
