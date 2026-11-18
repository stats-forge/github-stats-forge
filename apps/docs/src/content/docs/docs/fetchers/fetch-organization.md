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

One request reads the organization and 50 of its public, non-fork repositories, most-starred
first; the walk follows the cursor up to 500 repositories. Every total but `publicRepos` is a sum
over the repositories it saw — stars, forks, watchers, open issues and open pull requests — and
`truncated` says whether it saw them all. `publicRepos` is GitHub's own count either way.

Releases and default-branch commits are counted only under `include_releases` and
`include_commits`, and are `null` otherwise. GitHub spends about a third of a second counting them
on a large repository and gives up on a request after about ten, so a walk counting either reads 10
repositories a page and stops at 50.

Each page costs one point of the GraphQL rate limit.
