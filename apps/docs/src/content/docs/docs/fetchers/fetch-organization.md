---
title: fetchOrganization
description: 'An organization, with the totals of its public repositories.'
---

The fetcher behind the [organization card](../../cards/organization/).

<!-- api: fetchOrganization -->

## The login

The login is the name in `github.com/<org>`, and it is checked against GitHub's own login shape
before any request is made. A login that resolves to nothing — or to a user rather than an
organization — is a `not_found`.

## What it walks

One request reads the organization and 100 of its public, non-fork repositories, most-starred
first; the walk follows the cursor for up to five of those pages. Every total but `publicRepos` is
a sum over the repositories it saw — stars, forks, watchers, open issues, open pull requests,
releases and default-branch commits — and `truncated` says whether it saw them all.
`publicRepos` is GitHub's own count either way.

A page costs one point of the GraphQL rate limit whichever of those figures a card ends up
drawing: the counts ride on the repositories the walk was already reading.
