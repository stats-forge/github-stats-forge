---
title: fetchOrgActivity
description: 'What an organization did over a window.'
---

The fetcher behind the [organization activity card](../../cards/organization-activity/).

<!-- api: fetchOrgActivity -->

## The login

The login is the name in `github.com/<org>`, and it is checked against GitHub's own login shape
before any request is made. A login that resolves to nothing — or to a user rather than an
organization — is a `not_found`.

## The window

`days` is counted back from today, both ends inclusive, so `days: 1` is today alone and the
default 30 is today and the 29 days before it. It is a rolling window rather than a fixed range:
the card says what it is showing, and the numbers move with the calendar.

Every end is a UTC date, because a date is all a search qualifier reads.

## What it costs

Every count but the commits is an aliased `search` on one GraphQL request, and GitHub charges
that request a single rate-limit point however many searches ride on it — so the card's shape
does not change what it costs.

The commits are the exception. GitHub's GraphQL search has no commit index, so `include_commits`
adds a REST commit search, which is a second request against a much smaller allowance
(30 a minute). It is off unless asked for, and a refusal drops the count to `null` rather than
failing the card that is already fetched.

## What a search can see

A search answers what its token is allowed to find, so a token with access to the organization's
private repositories counts those too. The same query with a token that has none counts only the
public ones. That is GitHub's behaviour rather than a choice made here — but it means two
deployments can honestly draw different numbers for the same organization.
