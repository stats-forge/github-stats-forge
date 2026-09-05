---
title: fetchContributedTo
description: The repositories a user contributed to, ranked, and the years each contribution fell in.
---

The fetcher behind the [contributed-to card](../../cards/contributed-to/).

<!-- api: fetchContributedTo -->

## The range

Both ends are inclusive, and an omitted end is filled with the widest range GitHub will answer
for. A `contributionsCollection` spans at most a year, so the range is sliced into one per
calendar year and the slices are sent as fields of a single request — one rate-limit point for the
whole span rather than one per year.

## Ordering

Repositories come back most-contributions-first, with the years each one saw.
`repos_count` caps the list; `include_own_repos` decides whether the user's own repositories are in
it at all, and they are not by default.
