# The server and its image

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

`apps/server` is an HTTP server over core's `./api` handlers, shipped as a container image.
**It owns exactly four things core deliberately does not — routing, HTTP status and headers,
caching, and the process. Everything else it does is a bug.** `CardConfig.fromEnv` already reads
the tokens and the allowlists, and `ApiResult` already carries the code and whether a retry could
help, so there is nothing here to re-derive.

- **There is no build step, and there must not be one.** Node strips the types, every relative
  import names the `.ts` that exists, and `--conditions=@stats/source` points the core import at
  `packages/core/src` — pnpm links a workspace package as a symlink whose realpath falls outside
  `node_modules`, which is what lets node strip types there. So the image runs the sources: what
  is in the container is what is in the repository, and nothing is compiled or bundled.
  - It **was** bundled with rolldown for one afternoon on 2026-09-09. Two things killed it: the
    bundle is a second artifact nobody can diff against the repo, and the config key is
    `resolve.conditionNames`, not `conditions` — the wrong one is reported as an invalid option
    and then quietly leaves both workspace packages external, producing a 5 kB file that cannot
    start. Do not reinstate it.
- **The core of it is `(request: Request) => Promise<Response>`.** `node.ts` is the only file that
  knows what an `IncomingMessage` is, which is why `handler.ts` has forty-odd tests and it has
  two. A whole endpoint is testable with no socket and no token, because `CardConfig` already
  takes the transport.
  - **Nothing escapes the adapter.** A handler that throws is answered `500`, because an unhandled
    rejection is a dead process on Node 24 — and one did: `static.ts` only `stat`s before it
    reads, so a directory named `index.html` or a `0600` file on a bind mount made `readFile`
    reject through `route` and out of `void serve(...)`. `static.ts` now answers `undefined` for
    those, and the adapter's catch is the second line; `tests/node.test.ts` covers the catch.
- **No framework and no dependency.** `node:http` plus `URL` is the entire surface this needs, and
  this repository inlined an 87-byte regex rather than carry a dependency. If middleware ever
  justifies one, Hono speaks `Request`/`Response` and slots in without changing `handler.ts`. Not
  Express: it wants `req`/`res`, which is the shape this is deliberately not built on.
- **The server imports core and nothing else.** The CLI's catalog carries the same eight ids, but
  it carries prompt prose with them and inquirer's five prompt packages behind it, so
  `routes.ts` spells the table out and `tests/routes.test.ts` asserts twice over that it has not
  drifted: every card core exports is routed, and every path is named as the CLI names its card.
  The CLI is a **dev**dependency here for that test alone, which is what keeps it out of the
  image's `--prod` install.
- **A failure answers `200` with the drawn error card, and puts the truth in headers.** GitHub's
  image proxy only displays a `200`, so a `4xx` turns "Invalid username input" into a broken image
  in a README. `Card-Status`, `Card-Error-Code`, `Card-Error-Param` and `Card-Cache` are what a
  host branches on — the same argument that made `ApiResult` a union rather than a status string.
  `STRICT_HTTP_STATUS=true` maps the real codes for a caller that is not a README.
  - **No `X-` prefix.** RFC 6648 deprecated it in 2012. `X-Content-Type-Options` is the one
    exception, that being the header's registered name — renaming it would turn it off.
- **A held answer carries `Age`, and never a restarted `max-age`.** The first shape computed a
  countdown into `max-age` on a cache hit, which quietly overrode the `cache_seconds` the caller
  asked for. `Age` is the header that exists for this: a downstream cache subtracts it itself.
  - **The copy is held for the deployment's default, and `cache_seconds` shapes only the header.**
    `cacheKey` drops the param, so every caller shares one entry; storing it under the first
    caller's TTL let a `cache_seconds=86400` README keep everyone on day-old numbers past their own
    ten-hour `max-age`. `cache_seconds=0` also skips the held copy, so a `no-store` answer is never
    a `Card-Cache: hit`.
  - **One render per key at a time.** `createHandler` keeps the in-flight renders in a `Map`, so N
    requests arriving while a card is drawing share the one GitHub call; without it a hot README's
    TTL lapsing was N rate-limit points for N identical SVGs.
  - **`CardCache` is never `undefined`.** `CACHE_SECONDS=0` used to be represented twice — as a
    `0` and as a missing cache — and the two disagreed on a `?cache_seconds=` override. A TTL of
    `0` stores nothing, so the number is the one switch.
- **An empty environment variable is an unset one.** `docker compose` writes `""` for every
  `${VAR:-}` it has no value for, and an empty `CACHE_SECONDS` read as a number is `0` — which
  would silently turn caching off on an instance that never asked. `fromEnv` in `config.ts` is
  that guard, an empty `PAT_2` is dropped from the pool, and `tests/config.test.ts` covers both.
- **Never log a query value or a token.** A query holds usernames; `PersonalAccessToken` carries
  the env var's `name` for exactly this reason. One structured JSON line per request on stdout,
  built from the response's own headers rather than a second return channel out of the handler.
- **The image carries the documentation site, and `SITE_DIR` is what turns it on.** The static
  handler is claimed **last**, after `/api/**` and `/healthz`, so nothing the site holds can
  shadow a card; `/_astro/**` is immutable and everything else keeps 300s. Absent the variable the
  server draws cards and serves no pages, which is what a deployment wanting only an endpoint gets.
  - **A site build knows where it will be served from, so `SITE_DIR` and the build have to
    match.** `SITE_BASE` is the path it is written against — `/github-stats-forge` for Pages, `/`
    for the image — and pointing `SITE_DIR` at a Pages build serves HTML whose every asset 404s.
  - **`pnpm server:hosted` is the Dockerfile's site build plus `server:standalone` with
    `SITE_DIR=../docs/build`**, the path being relative to `apps/server`. Added on 2026-09-10,
    when the cards-only script answered neither `/` nor `/anvil/`. A shell variable beats the
    `.env`, node's `--env-file` never overriding one already set, so one `.env` serves both.
  - `send` in `node.ts` goes through `arrayBuffer`, not `text`, and so does the `Content-Length`
    a `HEAD` answers with: a PNG round-tripped through a string is a corrupted PNG, and the site
    has several.
  - **`toRequest` copies no header across.** Nothing routes on one, so the loop that did was dead
    work per request; add it back the day a route reads an `Accept` or an `If-None-Match`.
- **`SITE_SERVER=true` is what tells the anvil there is a server under it.** `anvil.astro` writes
  it onto the page as `data-source`, because `ui.ts` runs in a browser and has no environment.
  **Told, not probed**: the alternative is a request for `/healthz` on every load of the anvil on
  Pages, where there is nothing to find. It is also what recolours the site's icon — see
  `apps/docs/AGENTS.md`.
- **`node:24-alpine`, pinned by digest, and there is no lighter official Node image.** Measured
  from the registries on 2026-09-10: alpine 56 MB compressed, slim 77, the full image 391, and
  distroless 50. So distroless buys six megabytes for a container with no shell in it, which is
  not the trade to make on a server someone self-hosts and will want to look inside.
  - **`bookworm` is the Debian side of the same fork, not a lighter one.** `24-bookworm-slim` is
    byte-identical to `24-slim` and `24-bookworm` to `24`, so the choice is musl against glibc
    rather than size. Nothing here needs glibc — the `--prod` install is `zod` and nothing else,
    with no native addon anywhere — so Alpine stands. Revisit it if a native dependency arrives,
    or if DNS turns flaky in a cluster: musl's resolver is the usual suspect, and this server
    resolves `api.github.com` on every cache miss.
  - **The digest is there because `24-alpine` is a moving tag** — it has floated across Alpine
    3.20 to 3.24 for this Node major alone, so the OS under the image changed without the
    Dockerfile doing. **Dependabot maintains it** (`package-ecosystem: docker` on `/apps/server`),
    so a base bump arrives as a pull request CI has built. Both `FROM` lines carry the same
    digest; change them together.
- **The base stage deletes the root `prepare` script, because every `pnpm install` runs it.**
  It is `lefthook install`, and neither stage can satisfy it: `--prod` leaves lefthook
  uninstalled, so the shell reports `command not found`, and the site stage has lefthook but no
  `.git`, so it exits 128. Both failed the image build on 2026-09-10. `ENV LEFTHOOK=0` was there
  to prevent exactly that and never could — it silences the hook runner, not `lefthook install` —
  so it went with the fix. `pnpm pkg delete scripts.prepare` leaves each dependency's own
  postinstall alone, which `--ignore-scripts` would not.
- **The healthcheck is `src/healthcheck.ts`, not a `node -e` one-liner**, so it is typechecked,
  linted and formatted with the rest of the server. Two things it needs that the one-liner did not:
  `agent: false`, because node's global agent holds a socket alive for five seconds and would
  outlive the check's own three-second timeout; and `process.exitCode` rather than `process.exit`,
  which `unicorn/no-process-exit` forbids and which is unnecessary once the socket closes. Runs in
  79ms and verified three ways — `0` against a live server, `1` against a dead port and `1` against
  one answering `500`.
  - **`health.ts` is its own module for this**, holding `HEALTH_PATH` and the default port and
    host. `HEALTH_PATH` sat in `routes.ts`, which imports core's whole api behind the card table:
    130ms against 35ms for a bare start, every thirty seconds, to learn one string. The defaults
    moved in on 2026-09-10, when the check read `PORT` raw — an empty one dialled port 80 — and
    always dialled `127.0.0.1`, which a server bound to a concrete `HOST` never answers.
- **The image build is the one CI check that is not in `check-all`.** It needs docker, which not
  every checkout has, and it takes minutes rather than seconds. CI's `image` job builds it, starts
  it and asks it for a card — which is the only thing that proves the sources resolve inside the
  container, there being no compile step to fail first.
- **`base` is `--platform=$BUILDPLATFORM`; only `runtime` is multi-arch.** The install and the
  site build produce the same bytes on every architecture, so they run natively once rather than
  under QEMU per target, and a pnpm store cache mount keeps a lockfile change from a cold download.
  - **That mount is a local benefit, not a CI one.** BuildKit does not export a cache mount with
    `cache-to`, and `setup-buildx-action` starts a fresh builder each run, so in CI the store is
    empty every time.
  - **Neither image job carries a registry cache, since 2026-09-10.** The GitHub Actions cache
    exported every stage's layers on every run, and CI's build step still measured 98s to 145s
    across ten runs, warm or cold; a cache scoped per branch seldom hits from a pull request, and
    the release's would export two architectures of every stage to be read days later, if at all.
    Measure before reinstating one — that is what condemned this pair.
- **The two called workflows carry distinct concurrency groups.** In a called workflow
  `github.workflow` is the caller's name, so `publish-image.yml` and `deploy-docs.yml` both
  resolved to `Release` and queued behind each other; the image one is suffixed `-image`.
- **The release publishes to npm, GHCR and Pages, in that order, from one workflow.** The image
  job is gated on `hasChangesets == 'false'` and not on `published`: the server is private, so a
  change to it alone releases nothing to npm and would otherwise never reach GHCR. It then skips
  a version already in the registry, which is what makes that wider gate safe.
  - **The Pages job is gated on `published`, so a release that touches only the site or the server
    reaches GHCR and not Pages.** Both are private, so neither publishes to npm and `published`
    stays `false` — the same fact the image's wider gate exists for. The site then documents a
    version older than the image carries. `deploy-docs.yml` takes a `workflow_dispatch` for
    exactly this, falling back to `inputs.ref || github.sha`, so a run from `main` builds `main`;
    dispatch it, or wait for the next release that publishes a package.
- **A workflow in this repository calls its sibling with `$/`, not `./`.** That is the documented
  "same repo at the running commit" form, and `release.yml` used it before the image job existed.
  It was changed to `./` on 2026-09-09 by someone who took it for a typo, and changed back.
