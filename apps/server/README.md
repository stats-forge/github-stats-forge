# @stats-forge/github-stats-server

An HTTP server over `packages/core`'s api handlers, and the container image it ships in.
It owns exactly four things core deliberately does not:
routing, HTTP status and headers, caching, and the process.
Everything else it does is a bug.

## Running it

```sh
docker run -p 9000:9000 -e PAT_1=github_pat_... ghcr.io/stats-forge/github-stats-forge-server
```

Then a card is at `http://localhost:9000/api/stats?username=you`,
the documentation is at `/` and the card builder at `/anvil/`, drawing from this instance —
and `docker-compose.yml` beside this file is the copy-paste version.

From a checkout, `pnpm server:standalone` runs the same server against the repository root's `.env`,
cards only; `pnpm server:hosted` first builds the site the way the image does and serves it too.

## Routes

One path per card, named after the card.
Nothing hides under a bare prefix, so this is also the list of cards.
`GET` and `HEAD` only; anything else is `405` with an `Allow` header,
and a trailing slash resolves to the same route.

| Path                  | Draws                        |
| --------------------- | ---------------------------- |
| `/api/stats`          | commits, PRs, issues, a rank |
| `/api/top-langs`      | most-used languages          |
| `/api/pin`            | one repository or gist       |
| `/api/org`            | an organization              |
| `/api/contributed-to` | repositories contributed to  |
| `/api/gist`           | one gist                     |
| `/api/wakatime`       | WakaTime coding time         |
| `/healthz`            | `{"status":"ok"}`            |

An unknown path is `404` as JSON, not as a card: nothing asked for a card —
unless the documentation site is attached, which claims every path the table leaves.

## The documentation, and the anvil

The image carries the whole documentation site, built from the same commit,
so an instance documents itself rather than pointing at a copy on the internet.
It is served from `SITE_DIR`, claimed **last**: nothing under it can shadow a card.

The anvil at `/anvil/` is the reason to want it.
On GitHub Pages that page draws from a recording, because there is no server under it;
in the image it draws from the instance itself,
with your tokens, your allowlists and your real numbers,
and the picker beside it falls back to the recording — which is what an instance
with no `PAT_1` yet still has to offer.

**A site build knows where it will be served from, so the two have to match.**
`SITE_BASE` is the path the pages and their assets are written against
(`/github-stats-forge` for Pages, `/` for the image),
and `SITE_SERVER=true` is what tells the anvil there is a server under it.
Point `SITE_DIR` at a build made for Pages and every asset on the page 404s.
Nothing probes for a server, because on Pages there would be nothing to find.

Every query param a card accepts is documented on
[the site](https://stats-forge.github.io/github-stats-forge/).
The server adds one of its own, `cache_seconds` — see below.

## A failure is still an image

An error card is an image, and GitHub's image proxy only displays a `200`.
Return `4xx` and a README shows a broken image instead of "Invalid username input".
So a failure answers `200` with the drawn error card, and puts the truth in headers:

| Header             | On                   | Value                                                                                                 |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------------------------- |
| `Card-Status`      | every card           | `success` or `error`                                                                                  |
| `Card-Error-Code`  | a failure            | `invalid_param`, `missing_param`, `not_allowed`, `not_found`, `no_tokens`, `rate_limited`, `upstream` |
| `Card-Error-Param` | a failure naming one | the param at fault                                                                                    |
| `Card-Cache`       | every card           | `hit` or `miss`                                                                                       |

A host branches on a header instead of parsing an SVG —
the same reason `ApiResult` is a union rather than a status string.
`STRICT_HTTP_STATUS=true` answers with the code each failure deserves instead:
`400`, `403`, `404`, `429` with a `Retry-After`, `500`, `502`.

## Pinning an instance to yourself

`ALLOWLIST` is a comma-separated list of the GitHub logins this instance will draw —
users and organizations alike, GitHub sharing one namespace between them.
Anything else is refused as `not_allowed`, **before the request reaches GitHub**,
so someone else's README pointed at your instance costs you no rate limit.
Matching ignores case. `GIST_ALLOWLIST` does the same for the gist card's ids.

Two things worth knowing:

- **`ALLOWLIST` does not cover the wakatime card.**
  Its `username` is a WakaTime profile, not a GitHub login,
  so the list would be checking one service's names against another's.
  That card needs no GitHub token either.
  If you are pinning an instance and serving it publicly, leave the card unlinked
  or put the instance behind something that is not this list.
- **It is not authentication.**
  It limits _whose cards_ this instance draws, not _who may ask_.

## Caching

A success keeps for ten hours, a failure that may fix itself for ten minutes,
and one that will not for an hour —
a broken query costs one render rather than one per view.
`?cache_seconds=` shortens or lengthens a success within four hours to a day.

The process also holds what it drew, keyed by the path and the sorted query,
which turns a hot README into one GitHub request per TTL instead of one per view —
requests arriving while a card is drawing share the one call.
It is per-instance and lost on restart.
The copy is held for the default lifetime whatever a request's `cache_seconds` says,
which shapes only the header; `cache_seconds=0` skips the copy as well.
A held answer carries an `Age` header, so a downstream cache subtracts what has already elapsed.

## Configuration

Every variable is optional but `PAT_1`.

| Variable                 | Default            | What it does                                                 |
| ------------------------ | ------------------ | ------------------------------------------------------------ |
| `PAT_1`, `PAT_2`, …      | —                  | GitHub tokens, used in turn; a second doubles the rate limit |
| `PORT` / `HOST`          | `9000` / `0.0.0.0` | where it listens                                             |
| `ALLOWLIST`              | —                  | comma-separated GitHub logins this instance will draw        |
| `GIST_ALLOWLIST`         | —                  | comma-separated gist ids                                     |
| `EXCLUDE_REPO`           | —                  | repositories to leave out of the language and star counts    |
| `FETCH_MULTI_PAGE_STARS` | `1`                | pages of starred repositories to count, or `true` for all    |
| `STRICT_HTTP_STATUS`     | `false`            | answer with the status code a failure deserves               |
| `CACHE_SECONDS`          | —                  | default TTL for a success; `0` turns caching off entirely    |
| `CACHE_MAX_ENTRIES`      | `500`              | how many answers the process holds                           |
| `CORS_ORIGIN`            | —                  | the one origin allowed to read a card from script            |
| `REQUEST_TIMEOUT_MS`     | `10000`            | how long one GitHub call may take                            |
| `SHUTDOWN_TIMEOUT_MS`    | `10000`            | how long `docker stop` may drain for                         |
| `LOG_REQUESTS`           | `true`             | one structured line per request, on stdout                   |
| `SITE_DIR`               | set by the image   | the built documentation site to serve; no pages without it   |

`CACHE_SECONDS=0` is what makes an instance debuggable: it turns off the headers
and the copy the process holds, both.

A log line names the method, the path, the card, the status, the error code,
whether the cache answered and how long it took.
**It never carries a query value** — those hold usernames — and never a token.

## No build step

Node strips the types, so the image runs `src/index.ts`.
Nothing is compiled and nothing is bundled,
which means what runs in the container is what is in the repository.
`--conditions=@stats/source` is what points the core import at `packages/core/src`.
