---
title: fetchOrgCalendar
description: 'An organization’s weeks, each counting one kind of activity.'
---

The fetcher behind the [organization calendar card](../../cards/organization-calendar/).

<!-- api: fetchOrgCalendar -->

## The weeks

Each week is seven days ending on a weekday of today's, so the newest week ends today and is never a
stub. Every end is a UTC date, because a date is all a search qualifier reads.

## What it costs

Each week is an aliased `search` on one GraphQL request, and GitHub charges that request a single
rate-limit point however many weeks ride on it. Each search still adds to the time GitHub takes to
answer, about half a second for a busy organization, so past about four months a request outlasts
GitHub's ten-second limit, which answers with a `502` that the fetcher throws as an `upstream`
error. The calendar stops at two months to keep well clear of it.

## What a search can see

A search answers what its token is allowed to find, so a token with access to the organization's
private repositories counts those too.

A token that may not read issues is answered with pull requests rather than an error. Each week asks
for the first thing it matched, and an issue count that matched a pull request is refused as
`forbidden` instead of drawn.
