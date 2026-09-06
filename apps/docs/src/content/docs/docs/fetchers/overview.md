---
title: The fetchers
description: Read the numbers without drawing a card — the GitHub and WakaTime calls on their own.
---

The card handlers fetch and render in one call. The fetchers are the first half on its own:
they answer with the data, and what you do with it is your business —
a dashboard, a JSON endpoint, a database, or a card you render later.

```js
import { CardConfig, fetchStats } from '@stats-forge/github-stats-forge-core/fetchers';

const config = new CardConfig({ pats: [{ name: 'PAT_1', value: process.env.PAT_1 }] });
const stats = await fetchStats({ username: 'octocat' }, config);
```

Every fetcher takes its own options object and the same `CardConfig`,
which is why that class is exported from this entry point too rather than only from `/api`.

| Fetcher                                           | What it answers with                           |
| ------------------------------------------------- | ---------------------------------------------- |
| [`fetchStats`](../fetch-stats/)                   | One user's commits, PRs, issues, stars, rank   |
| [`fetchTopLanguages`](../fetch-top-languages/)    | The languages they write most                  |
| [`fetchRepo`](../fetch-repo/)                     | One repository                                 |
| [`fetchContributedTo`](../fetch-contributed-to/)  | The repositories they contribute to            |
| [`fetchGist`](../fetch-gist/)                     | One gist                                       |
| [`fetchWakatimeStats`](../fetch-wakatime-stats/)  | Coding time per language                       |
| [`fetchRepoUserStats`](../fetch-repo-user-stats/) | Their PRs and issues within given repositories |

Each page's reference block — the signature, every option and what comes back — is generated from
the fetcher's own doc comment, so it cannot describe a function core no longer has.

## What a fetcher does not do

- **It does not default anything a card defaults.** `langs_count`, `layout`, colors and titles are
  the renderer's business; a fetcher only knows what to ask GitHub for.
- **It does not validate a query string.** That is the api layer's job. A fetcher does check the
  shape of a value it is about to put in a URL — a GitHub login, for instance — because
  this entry point is public and that value reaches a request either way.
- **It does not catch.** A failure is thrown as a `CardError`, with the same
  [error codes](../../usage/library/#error-codes) the handlers report.

## Types

Each return type is exported alongside its fetcher, so a consumer can name what it holds:

```ts
import type { StatsData, TopLangData } from '@stats-forge/github-stats-forge-core/fetchers';
```

`ContributedToData`, `GistData`, `RepositoryData`, `RepoUserStats`, `WakaTimeData`, `Lang` and
`WakaTimeLang` come from the same place.

## Tokens

`retryer` is exported here as well. It is what walks the tokens in a `CardConfig`, moving to the
next when one is rate limited, and it is what the fetchers already run inside — you need it only
if you are writing a fetcher of your own.

A token is never logged; the name of the variable it came from is, so a failing token can be found
without its value reaching a log.
