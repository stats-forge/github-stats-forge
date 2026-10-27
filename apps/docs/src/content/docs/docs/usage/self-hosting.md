---
title: Self-hosting
description: Run the cards on your own server, from a container image, with your own tokens.
---

```sh
docker run -p 9000:9000 --env-file cards.env ghcr.io/stats-forge/github-stats-forge-server
```

A card is then at `http://localhost:9000/api/stats?username=you`. `cards.env` holds one line,
`PAT_1=` and a GitHub token — see [Where the token lives](#where-the-token-lives).

Prefer it to the [GitHub Action](https://github.com/stats-forge/github-stats-forge-action) when the
numbers should be live, or the token should stay on a machine you own.

## What it serves

`GET` and `HEAD`, one path per card; a trailing slash resolves to the same route.

| Path                  | Draws                        |
| --------------------- | ---------------------------- |
| `/api/stats`          | commits, PRs, issues, a rank |
| `/api/top-langs`      | most-used languages          |
| `/api/pin`            | one repository               |
| `/api/org`            | an organization              |
| `/api/org-activity`   | its PRs, issues and commits  |
| `/api/contributed-to` | repositories contributed to  |
| `/api/gist`           | one gist                     |
| `/api/wakatime`       | WakaTime coding time         |
| `/healthz`            | `{"status":"ok"}`            |

Every option on [Common options](../../customization/common-options/) and each card's page is a
query param, spelled the same.

The image also serves this site at `/`, built from the same commit, and `/anvil/` draws from the
instance itself, with your tokens.

## A failure is still an image

GitHub's image proxy shows only a `200`, so a failure answers `200` with the error drawn as a card,
and says what happened in headers:

| Header             | Says                                               |
| ------------------ | -------------------------------------------------- |
| `Card-Status`      | `success` or `error`                               |
| `Card-Error-Code`  | why it failed                                      |
| `Card-Error-Param` | the parameter at fault, when the failure names one |
| `Card-Cache`       | `hit`, `miss` or `stale`                           |

`STRICT_HTTP_STATUS=true` answers with the real status code instead, for anything that is not a
README.

## Pinning it to yourself

Without a list, an instance draws a card for anyone, on your rate limit:

```sh
ALLOWLIST=you,your-org
GIST_ALLOWLIST=0123456789abcdef0123456789abcdef
```

`ALLOWLIST` names the GitHub logins it serves, case-insensitively, on every card that takes one.
A gist is named by its id, so only `GIST_ALLOWLIST` guards the gist card. Neither covers the
WakaTime card, and neither is authentication: they limit whose cards are drawn, not who asks.

## Configuration

Everything but `PAT_1` is optional.

| Variable                 | Default            | What it does                                                 |
| ------------------------ | ------------------ | ------------------------------------------------------------ |
| `PAT_1`, `PAT_2`, …      | —                  | GitHub tokens, used in turn; a second doubles the rate limit |
| `PORT` / `HOST`          | `9000` / `0.0.0.0` | where it listens                                             |
| `ALLOWLIST`              | —                  | GitHub logins this instance will draw                        |
| `GIST_ALLOWLIST`         | —                  | gist ids it will draw                                        |
| `EXCLUDE_REPO`           | —                  | repositories to leave out of the language and star counts    |
| `FETCH_MULTI_PAGE_STARS` | `1`                | pages of starred repositories to count, or `true` for all    |
| `STRICT_HTTP_STATUS`     | `false`            | answer with the status code a failure deserves               |
| `CACHE_SECONDS`          | —                  | default lifetime of a drawn card; `0` turns caching off      |
| `STALE_SECONDS`          | `86400`            | how long a held card covers a failing redraw; `0` for none   |
| `CORS_ORIGIN`            | —                  | the one origin allowed to read a card from script            |

See [GitHub tokens](../tokens/) for which token each card needs.

## Where the token lives

Never `-e PAT_1=…`: the token would land in your shell history, the process list and
`docker inspect`. The server reads it from the environment, once at startup.

### An env file

```sh
umask 077
printf 'PAT_1=%s\n' "$token" > cards.env
docker run -p 9000:9000 --env-file cards.env ghcr.io/stats-forge/github-stats-forge-server
```

`--env-file` takes each value literally, quotes included. Keep the file out of version control.

### A token already in the environment

```sh
export PAT_1="$(pass github/cards)"
docker run -p 9000:9000 -e PAT_1 ghcr.io/stats-forge/github-stats-forge-server
```

### Docker Compose

```yaml
services:
  cards:
    image: ghcr.io/stats-forge/github-stats-forge-server:latest
    ports:
      - '9000:9000'
    environment:
      PAT_1: ${PAT_1:?set PAT_1 in a .env file beside this one}
```

The token goes in a `.env` beside it, and `:?` refuses to start without one. The repository's
`docker-compose.yml` is this file.

### From a secret manager

```sh
# cards.env holds: PAT_1=op://Private/github-cards/credential
op run --env-file cards.env -- \
  docker run -p 9000:9000 -e PAT_1 ghcr.io/stats-forge/github-stats-forge-server
```

A manager that only prints the value goes through a shell assignment, which keeps it out of the
arguments:

```sh
PAT_1="$(aws secretsmanager get-secret-value \
  --secret-id github-cards --query SecretString --output text)" \
  docker run -p 9000:9000 -e PAT_1 ghcr.io/stats-forge/github-stats-forge-server
```

### Kubernetes

```yaml
envFrom:
  - secretRef:
      name: github-cards
```

Sync that Secret from your cloud's secret manager with the External Secrets Operator or the Secrets
Store CSI Driver.

## Which version you run

No tag is `latest`. Each release also publishes its exact version and a `major.minor` that follows
its patches:

```sh
docker run -p 9000:9000 --env-file cards.env ghcr.io/stats-forge/github-stats-forge-server:0.4
```

What changed is on the [releases page](https://github.com/stats-forge/github-stats-forge/releases).

## Caching

A card is held for ten hours, a failure that might fix itself for ten minutes, and one that will not
for an hour. If a redraw fails, the last good card is served for up to a day longer, or for
`STALE_SECONDS`.
`?cache_seconds=` asks for a life between four and twenty-four hours; `CACHE_SECONDS=0` turns
caching off.

## In a README

```md
![your stats](https://cards.example.com/api/stats?username=you&theme=tokyonight)
```

Everything on [In a README](../in-your-readme/) applies unchanged.
