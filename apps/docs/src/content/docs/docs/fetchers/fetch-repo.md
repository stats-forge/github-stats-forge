---
title: fetchRepo
description: 'One repository: its description, stars, forks, language and the counts a card can add.'
---

The fetcher behind the [repository pin card](../../cards/repo-pin/).

<!-- api: fetchRepo -->

## Naming the repository

`repo` may carry the owner itself — `octocat/hello-world` — in which case it wins over `username`.
That is what lets one option name any repository, rather than only one of the user's own.

## The optional counts

`include_prs_authored`, `include_prs_commented`, `include_prs_reviewed`,
`include_issues_authored` and `include_issues_commented` each add a search request, scoped to this
repository rather than to the user.
