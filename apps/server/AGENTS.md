# The server and its image

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

`apps/server` is an HTTP server over core's `./api` handlers, shipped as a container image. Unless
another change is linked, a rule here comes from the PR that built it, [#79].

**It owns exactly four things core deliberately does not — routing, HTTP status and headers,
caching, and the process. Everything else it does is a bug.** `CardConfig.fromEnv` already reads
the tokens and allowlists, and `ApiResult` already says what failed and whether a retry helps.

## Never

- **Never log a query value or a token.** A query holds usernames; `PersonalAccessToken` carries the
  env var's `name` for exactly this. One structured JSON line per request on stdout, built from the
  response's own headers.
- **Never add a build step.** Node strips the types and `--conditions=@stats/source` points core at
  its source, so the image runs exactly what is in the repository. A rolldown bundle was tried and
  removed: an artifact nobody can diff, and its `resolve.conditionNames` key fails quietly when
  misspelt as `conditions`.
- **Never let a rejection escape the adapter.** A handler that throws is answered `500`, because an
  unhandled rejection kills the process on Node 24. `static.ts` answers `undefined` for what it
  cannot read, and `tests/node.spec.ts` covers the catch.
- **No framework and no dependency.** `node:http` plus `URL` is the whole surface. If middleware ever
  justifies one, Hono speaks `Request`/`Response`; not Express, which wants `req`/`res`.
- **No `X-` prefix on a header** (RFC 6648). `X-Content-Type-Options` is the exception, being that
  header's registered name.

## Shape

- **The core of it is `(request: Request) => Promise<Response>`.** `node.ts` is the only file that
  knows an `IncomingMessage`, so a whole endpoint is testable with no socket and no token.
- **The server imports core and nothing else at runtime.** `routes.ts` spells the route table out,
  and `tests/routes.spec.ts` checks it against both core's exports and the catalog's ids. The
  catalog is a **dev**dependency for that test alone, which keeps it out of the image.
- **A failure answers `200` with the drawn error card, and puts the truth in headers.** GitHub's image
  proxy shows only a `200`. `Card-Status`, `Card-Error-Code`, `Card-Error-Param` and `Card-Cache`
  are what a host branches on; `STRICT_HTTP_STATUS=true` maps the real codes.
- **An empty environment variable is an unset one.** `docker compose` writes `""` for every
  `${VAR:-}`, and an empty `CACHE_SECONDS` read as `0` would turn caching off. `fromEnv` in
  `config.ts` guards it, an empty `PAT_2` is dropped, and `tests/config.spec.ts` covers both.

## Caching

- **A held answer carries `Age`, never a restarted `max-age`**; a downstream cache subtracts `Age`
  itself, and a recomputed `max-age` overrode the caller's `cache_seconds`.
- **The copy is held for the deployment's default; `cache_seconds` shapes only the header.**
  `cacheKey` drops the param, so every caller shares one entry, and `cache_seconds=0` skips the held
  copy, so a `no-store` answer is never a `Card-Cache: hit`.
- **One render per key at a time.** `createHandler` shares an in-flight render, so concurrent
  requests for one card cost one GitHub call.
- **`CardCache` is never `undefined`.** A TTL of `0` stores nothing, so the number is the one switch.

## The site it carries

- **`SITE_DIR` turns the site on, and its handler is claimed last**, after `/api/**` and `/healthz`,
  so nothing the site holds can shadow a card. `/_astro/**` is immutable; the rest keeps 300s.
  Without it the server draws cards only.
  - **`SITE_DIR` must point at a build made for `/`.** `SITE_BASE` is baked into a build, and a
    Pages build served here 404s every asset.
  - **`pnpm server:hosted` is the Dockerfile's site build plus `server:standalone` with
    `SITE_DIR=../docs/build`**, relative to `apps/server`. A shell variable beats the `.env`, so one
    `.env` serves both scripts.
  - **`send` goes through `arrayBuffer`, not `text`**, and so does a `HEAD`'s `Content-Length`: a
    PNG round-tripped through a string is corrupted.
  - **`toRequest` copies no header across**, since nothing routes on one; add it back the day a
    route reads one.
- **`SITE_SERVER=true` is what tells the anvil there is a server under it** — told, not probed, so
  the Pages build makes no `/healthz` request. See `apps/docs/AGENTS.md`.

## The image

- **The image build is the one CI check not in `check-all`**: it needs docker and takes minutes.
  CI's `image` job builds it, starts it and asks for a card — the only proof the sources resolve in
  the container.
- **`node:24-alpine`, pinned by digest.** Distroless saves too little to give up a shell on a server
  people self-host, and `bookworm` differs in libc, not size. Nothing needs glibc; revisit if a
  native dependency arrives, or if DNS turns flaky in a cluster (musl's resolver is the usual
  suspect).
  - **The digest is pinned because `24-alpine` moves.** Renovate's `dockerfile` manager bumps it;
    both `FROM` lines carry the same digest, so change them together.
- **The base stage deletes the root `prepare` script**, which every `pnpm install` runs and neither
  stage can satisfy (no lefthook under `--prod`, no `.git` in the site stage). `LEFTHOOK=0` does not
  help: it silences the hook runner, not `lefthook install`.
- **The healthcheck is `src/healthcheck.ts`, not a `node -e` one-liner**, so it is typechecked and
  linted. It needs `agent: false`, or the global agent's kept-alive socket outlives the check's
  timeout, and it sets `process.exitCode` rather than calling `process.exit`.
  - **`health.ts` holds `HEALTH_PATH` and the default port and host**, so the check imports no card
    code and dials the address a server bound to `HOST` actually answers.
- **`base` is `--platform=$BUILDPLATFORM`; only `runtime` is multi-arch.** The install and the site
  build produce the same bytes everywhere, so they run natively once, not under QEMU per target.
  - **The pnpm store cache mount helps local builds only**: CI starts a fresh builder each run.
  - **Neither image job carries a registry cache** ([#83]): it was measured to save nothing. Measure
    before reinstating one.

## The release

- **The release publishes to npm, GHCR and Pages, in that order, from one workflow.** The image job
  is gated on the server's entry in `published-packages`, and `publish-image.yml` skips a version
  already in the registry, so a re-run cannot republish.
  - **Tagging the server is what lets Pages go out with a server release** ([#133]). One gate now
    serves both; `deploy-docs.yml` keeps `workflow_dispatch` for a build from `main` between
    releases.
  - **The `annotate` job names the image on the release** ([#135]). It reads the version from
    `published-packages`, needs `image` so the reference resolves, and re-reads the body so a
    re-run does not append twice.
- **The two called workflows carry distinct concurrency groups.** In a called workflow
  `github.workflow` is the caller's name, so the image group is suffixed `-image`.
- **A workflow calls its sibling with `$/`, not `./`.** It is the documented "same repository at
  the running commit" form, not a typo.

[#79]: https://github.com/stats-forge/github-stats-forge/pull/79
[#83]: https://github.com/stats-forge/github-stats-forge/pull/83
[#133]: https://github.com/stats-forge/github-stats-forge/pull/133
[#135]: https://github.com/stats-forge/github-stats-forge/pull/135
