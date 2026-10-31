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
`contributedTo`, `gist`, `org`, `orgActivity` and `wakatime`.

Nothing in the library reads `process.env`. The host builds the configuration and passes it in,
which is what lets the same code run in an action, on a server and in a browser.

[The GitHub Stats Forge action](https://github.com/stats-forge/github-stats-forge-action) is these
handlers and a step that writes the file; reach for the library where the action cannot go.

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

:::note
The card labels itself: `role="img"` with a `<title>` and a `<desc>` saying what it shows, since
assistive technology cannot reach the text inside an image role.
:::

### Error codes

| Code            | What happened                                      | Retryable |
| --------------- | -------------------------------------------------- | --------- |
| `forbidden`     | The token may not read a stat the query asked for  | yes       |
| `invalid_param` | A parameter is malformed or not renderable         | no        |
| `missing_param` | A parameter the card cannot render without         | no        |
| `not_allowed`   | The deployment does not serve that account or gist | no        |
| `not_found`     | The user, repository or gist does not exist        | no        |
| `no_tokens`     | The deployment has no usable GitHub token          | yes       |
| `rate_limited`  | Every token is rate limited                        | yes       |
| `upstream`      | GitHub or WakaTime failed to answer usably         | yes       |

Branch on the code, never the message, and on `retryable` to choose between caching the failure
and trying again. [Troubleshooting](../troubleshooting/) has what each card reads.

## Configuring a deployment

```js
const config = new CardConfig({
  pats: [{ name: 'PAT_1', value: process.env.PAT_1 }],
  usernameAllowlist: ['octocat'],
  excludeRepositories: ['octocat/scratch'],
  fetchMultiPageStars: 1,
  fetch: myFetch,
  requestTimeoutMs: 10_000,
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
| `requestTimeoutMs`    | How long one request may wait before it fails as `upstream`; omit to wait  |

`CardConfig.fromEnv(process.env)` builds the same thing from `PAT_1`…, `ALLOWLIST`,
`GIST_ALLOWLIST`, `EXCLUDE_REPO` and `FETCH_MULTI_PAGE_STARS`, for a host that would rather
configure through the environment. A `PAT_` variable set to nothing is skipped.

A configuration is immutable. `config.with({ pats })` returns a copy, which is how a host swaps in
a token belonging to the request rather than to the deployment.

The handlers check an allowlist before fetching anything, so an identity the deployment does not
serve fails as `not_allowed` and spends no rate limit. It covers `username`, the organization
cards' `org` and the gist card's `id`, but **not** the WakaTime card, whose `username` is a
WakaTime profile. Calling a render function directly skips the check.

## The options, as data

```sh
npm install @stats-forge/github-stats-forge-catalog
```

```js
import { findCard } from '@stats-forge/github-stats-forge-catalog';

const card = findCard('stats');

for (const option of card.options) {
  // option.name is the query param, option.label what to call it,
  // option.kind which control to draw, option.choices what it accepts
}
```

Anything offering those params to somebody — a form, a generator, an editor — needs each one's name
and accepted values. The catalog holds them, read off the handlers' own `OPTIONS`
(`topLangs.OPTIONS.layout` is what `?layout=` accepts), so it cannot offer a value the api would
reject. The CLI's prompts and this site's card builder are both forms over it.

`card.render` is the handler, so a form can draw what it is building; `card.needsToken` says
whether that costs a GitHub token.

## Other entry points

| Import                                          | What it holds                                 |
| ----------------------------------------------- | --------------------------------------------- |
| `@stats-forge/github-stats-forge-core/api`      | The card handlers, `CardConfig`, `ApiResult`  |
| `@stats-forge/github-stats-forge-core/fetchers` | The GitHub and WakaTime fetchers on their own |
| `@stats-forge/github-stats-forge-core/themes`   | The theme table                               |
