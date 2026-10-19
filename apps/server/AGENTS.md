# The server and its image

> Scoped to this tree; the repo-wide rules are in the root `AGENTS.md`.

An HTTP server over core's `./api` handlers, shipped as a container image; a rule with no link comes
from [#79]. **It owns routing, HTTP status and headers, caching and the process, and nothing else**:
`CardConfig.fromEnv` reads the tokens and allowlists, and `ApiResult` says what failed.

## Never

- **Log a query value or a token.** One JSON line per request on stdout, built from the response's
  headers; `PersonalAccessToken` carries the env var's `name` for this.
- **Add a build step.** Node strips the types and `--conditions=@stats/source` points at core's
  source, so the image runs the repository. A rolldown bundle was removed: nobody could diff it, and
  its `resolve.conditionNames` fails quietly when misspelt `conditions`.
- **Let a rejection escape the adapter**: Node 24 dies on one. A throwing handler answers `500`,
  `static.ts` answers `undefined` for what it cannot read, and `tests/node.spec.ts` covers the catch.
- **Add a framework or a dependency**: `node:http` plus `URL` is the surface. Should middleware ever
  justify one, Hono speaks `Request`/`Response`; Express does not.
- **Prefix a header with `X-`** (RFC 6648), `X-Content-Type-Options` excepted.

## Shape

- **The core is `(request: Request) => Promise<Response>`**; only `node.ts` knows an
  `IncomingMessage`, so an endpoint tests with no socket and no token.
- **At runtime it imports core alone.** `tests/routes.spec.ts` checks `routes.ts` against core's
  exports and the catalog's ids, the catalog being a devDependency for that test only.
- **A failure answers `200` with the drawn error card**, since GitHub's image proxy shows only a
  `200`, and puts the truth in `Card-Status`, `Card-Error-Code`, `Card-Error-Param` and `Card-Cache`.
  `STRICT_HTTP_STATUS=true` sends the real codes.
- **An empty env var is an unset one**: `docker compose` writes `""` for `${VAR:-}`, and an empty
  `CACHE_SECONDS` read as `0` would turn caching off. `fromEnv` guards it and drops an empty `PAT_2`;
  `tests/config.spec.ts` covers both.

## Caching

- **A held answer carries `Age`, never a restarted `max-age`**, which overrode the caller's
  `cache_seconds`.
- **The copy is held for the deployment's default; `cache_seconds` shapes only the header.**
  `cacheKey` drops it so every caller shares one entry, and `cache_seconds=0` skips the held copy, so
  a `no-store` answer is never a `Card-Cache: hit`.
- **One render per key at a time**: concurrent requests share the one in flight.
- **`CardCache` is never `undefined`**: a TTL of `0` stores nothing.
- **A success is kept `STALE_SECONDS` past its TTL** (`STALE_WHILE_REVALIDATE` by default, `0` for
  none) to answer for a redraw that fails retryably. `get` sees the fresh entries and `getStale` the
  rest; a retryable error never overwrites the kept card, which then lives `TTL.retryableError`, and
  `cache_seconds=0` refuses it. An error is never kept stale, and eviction drops stale before fresh.

## The site it carries

- **`SITE_DIR` turns the site on, its handler claimed last**, after `/api/**` and `/healthz`, so
  nothing it holds can shadow a card. `/_astro/**` is immutable, the rest kept 300s.
  - **It must be a build for `/`**: `SITE_BASE` is baked in, and a Pages build 404s every asset.
  - **`pnpm server:hosted` is the Dockerfile's site build plus `server:standalone` with
    `SITE_DIR=../docs/build`**. A shell variable beats the `.env`, so one `.env` serves both scripts.
  - **`send` and a `HEAD`'s `Content-Length` go through `arrayBuffer`**: a string corrupts a PNG.
  - **`toRequest` copies no header**, since no route reads one.
- **`SITE_SERVER=true` tells the anvil a server is under it**, told rather than probed, so the Pages
  build makes no `/healthz` request.

## The image

- **The image build is the one CI check outside `check-all`**, needing docker and minutes. CI's
  `image` job builds it, starts it and asks for a card.
- **`node:24-alpine`, pinned by digest** in both `FROM` lines, which Renovate bumps together.
  Distroless costs the shell, and `bookworm` differs only in libc. Revisit for a glibc dependency or
  flaky cluster DNS (musl's resolver).
- **The base stage deletes the root `prepare` script**, which neither stage can run (no lefthook
  under `--prod`, no `.git` for the site). `LEFTHOOK=0` silences the hooks, not `lefthook install`.
- **The healthcheck is `src/healthcheck.ts`**, typechecked and linted. It needs `agent: false`, or a
  kept-alive socket outlives its timeout, and sets `process.exitCode` rather than calling
  `process.exit`. `health.ts` holds `HEALTH_PATH` and the default port and host, so the check imports
  no card code and dials what `HOST` bound.
- **`base` is `--platform=$BUILDPLATFORM`; only `runtime` is multi-arch**: the install and the site
  build give the same bytes everywhere. The pnpm store cache mount helps local builds only, and a
  registry cache saved nothing ([#83]); measure before reinstating one.

## The release

- **One workflow publishes to npm, GHCR, then Pages.** The image job is gated on the server's entry in
  `published-packages`, and `publish-image.yml` skips a version already pushed, so a re-run cannot
  republish.
  - **Tagging the server releases Pages with it** ([#133]); `deploy-docs.yml` keeps
    `workflow_dispatch` for a build between releases.
  - **`annotate` names the image on the release** ([#135]), after `image`, re-reading the body so a
    re-run does not append twice.
- **The two called workflows have distinct concurrency groups**: in a called workflow
  `github.workflow` is the caller's name, so the image group is suffixed `-image`.
- **A workflow calls its sibling with `$/`, not `./`**: the documented same-commit form, not a typo.

[#79]: https://github.com/stats-forge/github-stats-forge/pull/79
[#83]: https://github.com/stats-forge/github-stats-forge/pull/83
[#133]: https://github.com/stats-forge/github-stats-forge/pull/133
[#135]: https://github.com/stats-forge/github-stats-forge/pull/135
