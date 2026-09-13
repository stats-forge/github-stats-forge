---
title: The library
description: Call the card handlers from your own code, in an action, on a server or in a browser.
---

```sh
npm install @stats-forge/github-stats-forge-core
```

```js
import { CardConfig, stats } from '@stats-forge/github-stats-forge-core/api';

const config = new CardConfig({
  pats: [{ name: 'PAT_1', value: process.env.PAT_1 }],
});

const result = await stats({ username: 'octocat', show_icons: 'true' }, config);
```

A handler takes the query params its card accepts — as strings, the way a query string carries
them — and the configuration for the deployment. The handlers are `stats`, `topLangs`, `pin`,
`contributedTo`, `gist`, `org` and `wakatime`.

Nothing in the library reads `process.env`. The host builds the configuration and passes it in,
which is what lets the same code run in an action, on a server and in a browser.

This is the layer underneath the rest: [the GitHub Stats Forge action](https://github.com/stats-forge/github-stats-forge-action), the recommended
way to put a card in a repository, is these handlers and a step that writes the file. Reach for the
library when you want a card somewhere the action cannot go.

## What comes back

```js
if (result.status === 'success') {
  // result.content is the card, as SVG
} else {
  // result.content     is the failure, drawn as a card
  // result.error.code  is why it failed
  // result.error.param is the parameter at fault, when it names one
  // result.retryable   is whether trying again could help
}
```

Both branches carry a `content` you can serve: a failure is still an image, so a README shows the
reason rather than a broken picture.

### Error codes

| Code            | What happened                                       | Retryable |
| --------------- | --------------------------------------------------- | --------- |
| `invalid_param` | A parameter is malformed or not renderable          | no        |
| `missing_param` | A parameter the card cannot render without          | no        |
| `not_allowed`   | The deployment does not serve that account or gist  | no        |
| `not_found`     | The user, repository or gist does not exist         | no        |
| `no_tokens`     | The deployment has no usable GitHub token           | yes       |
| `rate_limited`  | Every token is rate limited                         | yes       |
| `upstream`      | GitHub or WakaTime answered with something unusable | yes       |

A host branches on the code rather than on the message, and uses `retryable` to decide between
caching the failure and trying again.

## Configuring a deployment

```js
const config = new CardConfig({
  pats: [{ name: 'PAT_1', value: process.env.PAT_1 }],
  usernameAllowlist: ['octocat'],
  excludeRepositories: ['octocat/scratch'],
  fetchMultiPageStars: 1,
  fetch: myFetch,
});
```

| Field                 | What it is                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| `pats`                | The tokens to spend, each with the name of the variable it came from       |
| `usernameAllowlist`   | The GitHub logins this deployment draws, case-insensitively; omit for any  |
| `gistAllowlist`       | The same, for gist ids                                                     |
| `excludeRepositories` | Repositories left out of every card                                        |
| `fetchMultiPageStars` | How many pages of starred repositories to read; `Infinity` for all         |
| `fetch`               | The transport every request goes through — swap it to cache, mock or proxy |

`CardConfig.fromEnv(process.env)` builds the same thing from `PAT_1`…, `ALLOWLIST`,
`GIST_ALLOWLIST`, `EXCLUDE_REPO` and `FETCH_MULTI_PAGE_STARS`, for a host that would rather
configure through the environment. A `PAT_` variable set to nothing is skipped.

An allowlist is enforced by the api handlers, before anything is fetched, so an identity the
deployment does not serve fails as `not_allowed` and spends no rate limit. It covers every
GitHub login — `username` and the organization card's `org` — and the gist card's `id`. It does
**not** cover the wakatime card, whose `username` is a WakaTime profile rather than a GitHub
login. Calling a render function directly bypasses the check: it lives at the api layer,
which is where a query stops being untrusted.

A token is never logged. The name it came from is, so a failing token can be found without its
value ending up in a log.

## Other entry points

| Import                                          | What it holds                                 |
| ----------------------------------------------- | --------------------------------------------- |
| `@stats-forge/github-stats-forge-core/api`      | The card handlers, `CardConfig`, `ApiResult`  |
| `@stats-forge/github-stats-forge-core/fetchers` | The GitHub and WakaTime fetchers on their own |
| `@stats-forge/github-stats-forge-core/themes`   | The theme table                               |
