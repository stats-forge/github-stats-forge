# @stats-forge/github-stats-forge-core

Core library powering [GitHub Stats Forge](https://github.com/stats-forge/github-stats-forge):
it turns GitHub and WakaTime data into SVG cards.

It is what the CLI and any self-hosted endpoint call. Nothing here touches the
environment or the filesystem — you pass a config in, you get a string of SVG back — so it
behaves the same under Node, in a browser and under a test runner.

```sh
pnpm add @stats-forge/github-stats-forge-core
```

Requires Node 24 or newer.

## Quick start

An endpoint is one call. The handler parses the query string, fetches, renders, and hands
back either the card or a rendered error:

```ts
import { CardConfig, stats } from '@stats-forge/github-stats-forge-core/api';

const config = new CardConfig({ pats: [{ name: 'PAT_1', value: process.env.PAT_1! }] });

const result = await stats({ username: 'anuraghazra', theme: 'tokyonight' }, config);

if (result.status === 'error') {
  console.error(result.error.code, result.error.message);
}
// `content` is an SVG either way: a failure is a card that says what went wrong.
response.setHeader('Content-Type', 'image/svg+xml');
response.end(result.content);
```

## Entry points

Import the layer you need rather than the whole package:

| Path        | What it holds                                              |
| ----------- | ---------------------------------------------------------- |
| `/api`      | The five endpoint handlers, `ApiResult`, `CardConfig`      |
| `/cards`    | The render functions, for data you already hold            |
| `/fetchers` | The GitHub and WakaTime fetchers, `retryer`, `CardError`   |
| `/themes`   | The theme table and `ThemeName`                            |
| `.`         | The handlers plus `CardConfig`, `themes` and `renderError` |

## The five cards

Each handler is a named export carrying the values its enum params accept, so a UI can
read the choices off the function it calls instead of hardcoding them:

| Handler    | Card                                     | Lists it carries             |
| ---------- | ---------------------------------------- | ---------------------------- |
| `stats`    | Commits, PRs, issues, reviews and a rank | `RANK_ICONS`                 |
| `topLangs` | Most used languages                      | `LAYOUTS`, `STATS_FORMATS`   |
| `pin`      | A pinned repository                      | —                            |
| `gist`     | A gist                                   | —                            |
| `wakatime` | WakaTime coding time                     | `LAYOUTS`, `DISPLAY_FORMATS` |

```ts
import { topLangs } from '@stats-forge/github-stats-forge-core/api';

topLangs.LAYOUTS; // ['compact', 'normal', 'donut', 'donut-vertical', 'pie'] — what `?layout=` accepts
```

## Config

`CardConfig` is built by the host rather than read from the environment, and it is
immutable — `with()` returns a copy, which is how a host swaps in a per-request token:

```ts
import { CardConfig } from '@stats-forge/github-stats-forge-core/api';

const base = CardConfig.fromEnv(process.env); // reads PAT_1, PAT_2, … plus the allowlists
const forThisRequest = base.with({ pats: [{ name: 'user', value: userToken }] });
```

| Field                 | What it does                                                        |
| --------------------- | ------------------------------------------------------------------- |
| `pats`                | The token pool; the retryer rotates through it on a rate limit      |
| `fetch`               | The transport every request goes through (see below)                |
| `usernameAllowlist`   | Restrict which users this deployment serves; `undefined` allows all |
| `gistAllowlist`       | The same, for gist ids                                              |
| `excludeRepositories` | Repositories left out of star counts                                |
| `fetchMultiPageStars` | How many pages of starred repos to walk; `Infinity` for all         |

### Substituting the transport

`fetch` defaults to the global one, resolved at call time. Passing your own is how you
mock, cache or proxy every request the library makes — no global patching:

```ts
const config = new CardConfig({
  pats,
  fetch: async (url, init) => {
    const cached = await cache.get(url);
    return cached ?? cache.put(url, await fetch(url, init));
  },
});
```

Every card is labelled for screen readers: the SVG carries `role="img"` with a `<title>`
and `<desc>` describing what it shows, since assistive technology cannot reach the text
inside an image role.

## Errors

Everything throws a `CardError`, and the handler turns it into a result rather than a
rejection. `ApiResult` is a union, so a host branches on the code instead of parsing the
SVG:

```ts
const result = await stats({ username }, config);
if (result.status === 'error') {
  const { code, param, message } = result.error;
  // 'invalid_param' | 'missing_param' | 'not_found' | 'no_tokens' | 'rate_limited' | 'upstream'
  if (result.retryable) {
    // a retry may help; the rest are permanent and safe to cache
  }
}
```

## Themes

```ts
import { themes } from '@stats-forge/github-stats-forge-core/themes';

Object.keys(themes); // 79 names, and what `?theme=` accepts
```

An unknown theme name falls back to the default rather than failing, so a typo still
renders a card.

## Acknowledgements

It continues the work of [github-stats-extended](https://github.com/stats-organization/github-stats-extended),
which is itself based on [github-readme-stats](https://github.com/anuraghazra/github-readme-stats).
