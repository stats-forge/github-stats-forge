---
title: fetchRepoUserStats
description: One user's pull requests and issues within a set of repositories, counted by search.
---

The counts the [stats](../../cards/stats/) and [repository pin](../../cards/repo-pin/) cards add
when asked for them. It is exported on its own because the numbers are useful without either card.

<!-- api: fetchRepoUserStats -->

## Why it is separate

These come from GitHub's search API rather than from the user's own GraphQL node, which makes them
scopeable — to a repository, to an owner, or to both — and separately rate limited.
[`fetchStats`](../fetch-stats/) calls this for you when a card asks for one of the counts;
call it directly when you want the numbers and not the rest of the stats.

## Cost

One search request per count asked for. Ask for none and it makes no request at all.
