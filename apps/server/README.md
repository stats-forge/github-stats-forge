# @stats-forge/github-stats-server

An HTTP server over `packages/core`'s api handlers, and the container image it ships in.
It owns exactly four things core deliberately does not:
routing, HTTP status and headers, caching, and the process.
Everything else it does is a bug.

```sh
docker run -p 9000:9000 --env-file cards.env ghcr.io/stats-forge/github-stats-forge-server
```

`cards.env` holds `PAT_1=` and a token, and `docker-compose.yml` beside this file is the
copy-paste version.

> [!WARNING]
> Never `-e PAT_1=github_pat_...` — that leaves the token in your shell history
> and in `docker inspect`.

A card is then at `http://localhost:9000/api/stats?username=you`, the documentation at `/` and the
card builder at `/anvil/`, both built from this commit and drawing from this instance.

> [!TIP]
> **[Self-hosting](https://stats-forge.github.io/github-stats-forge/docs/usage/self-hosting/)** documents
> every route, the `Card-*` headers, the allowlists, caching, every environment variable
> and where the token lives. `cache_seconds` is the one query param the server adds to
> [what each card accepts](https://stats-forge.github.io/github-stats-forge/docs/).

## From a checkout

```sh
pnpm server:standalone   # this server against the repository root's .env, cards only
pnpm server:hosted       # the site built the way the image builds it, and served too
```

Node strips the types, so the image runs `src/index.ts` — nothing is compiled and nothing is
bundled, which means what runs in the container is what is in the repository. `AGENTS.md` beside
this file has the rest of the internals.
