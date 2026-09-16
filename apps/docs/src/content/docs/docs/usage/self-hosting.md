---
title: Self-hosting
description: Run the cards on your own server, from a container image, with your own tokens.
---

```sh
docker run -p 9000:9000 --env-file cards.env ghcr.io/stats-forge/github-stats-forge-server
```

That is a card server. A card is then at
`http://localhost:9000/api/stats?username=you`, and anything that displays an image can point at
it — a README, a profile page, a dashboard.

`cards.env` holds one line, `PAT_1=` and a GitHub token — a file rather than `-e PAT_1=...`,
which would leave the token in your shell history.
[Where the token lives](#where-the-token-lives) has the rest.

It is worth running when the [GitHub Action](https://github.com/stats-forge/github-stats-forge-action) is not the right shape: when
the numbers should be current at the moment someone looks rather than at the moment a workflow last
ran, when the cards are for repositories a workflow cannot see, or when you would rather the token
stayed on a machine you own.

## What it serves

One path per card, named after the card.
`GET` and `HEAD` only, and a trailing slash resolves to the same route.

| Path                  | Draws                        |
| --------------------- | ---------------------------- |
| `/api/stats`          | commits, PRs, issues, a rank |
| `/api/top-langs`      | most-used languages          |
| `/api/pin`            | one repository or gist       |
| `/api/org`            | an organization              |
| `/api/org-activity`   | its PRs, issues and commits  |
| `/api/contributed-to` | repositories contributed to  |
| `/api/gist`           | one gist                     |
| `/api/wakatime`       | WakaTime coding time         |
| `/healthz`            | `{"status":"ok"}`            |

Every option on [Common options](../../customization/common-options/) and on each card's own page is a
query param here, spelled exactly as it is there.

## The documentation comes with it

Everything you are reading is inside the image, at `/` — the whole site, built from the same commit
as the server. So an instance documents the version that is running rather than whatever happens to
be published, and it works with no connection to this site at all.

You will know you are on one: the icon turns amber, the header says **Self-hosted** beside the
title, and the tab and the landing page say so too.

## And so does the anvil

`/anvil/` is the card builder — a form over a card's options, the card redrawn beside it. On this
site it draws from saved API responses, because there is no server under it. On your instance it
draws from the instance itself, so:

- the figures are **your** real ones, fetched with your tokens and subject to your allowlists
- typing a different username draws that account, rather than leaving the numbers where they are
- the card's own URL sits above the file, already pointing at your instance, with the markdown line
  for a README beside it — the one thing this site cannot produce, since it has no way to know
  where your server lives
- every redraw is a GitHub call on a cache miss, so the preview says **Drawing…** over the card
  that is still up rather than leaving you guessing whether anything happened

If no token is configured yet, every card comes back asking for one. A picker beside the card falls
back to the saved responses so the builder is still usable while you set that up.

## A failure is still an image

GitHub's image proxy only displays a `200`, so a `404` would turn "Invalid username input" into a
broken image in a README. A failure therefore answers `200` with the error drawn as a card, and
puts the truth in headers:

| Header             | Says                                               |
| ------------------ | -------------------------------------------------- |
| `Card-Status`      | `success` or `error`                               |
| `Card-Error-Code`  | why it failed                                      |
| `Card-Error-Param` | the parameter at fault, when the failure names one |
| `Card-Cache`       | `hit` or `miss`                                    |

Set `STRICT_HTTP_STATUS=true` and it answers with the code the failure deserves instead — `400`,
`403`, `404`, `429`, `500`, `502` — which is what you want for anything that is not a README.

## Pinning it to yourself

An instance with a token on it will draw a card for anyone who asks, and spend your rate limit
doing it. `ALLOWLIST` is a comma-separated list of the GitHub logins it will serve, users and
organizations alike, matched without regard to case; `GIST_ALLOWLIST` does the same for gist ids.
Anything else is refused before a single request reaches GitHub.

Two things it is not. It does not cover the WakaTime card, whose username is a WakaTime profile
rather than a GitHub login. And it is not authentication: it limits whose cards the instance
draws, not who may ask it to draw them.

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
| `CORS_ORIGIN`            | —                  | the one origin allowed to read a card from script            |

A classic token with no scopes at all is enough, the same one the CLI takes — the cards read
public data only.

## Where the token lives

`-e PAT_1=github_pat_...` leaks it: the value lands in your shell history, in the host's process list,
and in `docker inspect`. The server reads the environment and nothing else — no config file,
no `PAT_1_FILE` — so every form below gets the token there without putting it in an argument.
It is read once, at startup, so a rotated token is a restart.

### An env file

```sh
umask 077                                   # not world-readable
printf 'PAT_1=%s\n' "$token" > cards.env
docker run -p 9000:9000 --env-file cards.env ghcr.io/stats-forge/github-stats-forge-server
```

`--env-file` reads `NAME=value` literally — nothing is expanded, and quotes become part of the
value. `PAT_2` on its own line doubles the rate limit. Keep the file out of version control.

### A token already in the environment

`-e NAME` with no `=` passes through what the shell already holds:

```sh
export PAT_1="$(pass github/cards)"
docker run -p 9000:9000 -e PAT_1 ghcr.io/stats-forge/github-stats-forge-server
```

### Docker Compose

Compose interpolates from a `.env` beside it, so the YAML names the token and the file holds it:

```yaml
services:
  cards:
    image: ghcr.io/stats-forge/github-stats-forge-server:latest
    ports:
      - '9000:9000'
    environment:
      PAT_1: ${PAT_1:?set PAT_1 in a .env file beside this one}
```

`:?` makes a missing token a startup failure rather than an instance that draws `no_tokens` on
every card. `docker-compose.yml` in the repository is this file.

### From a secret manager

The file holds a reference, the manager resolves it, and the token never reaches disk:

```sh
# cards.env holds: PAT_1=op://Private/github-cards/credential
op run --env-file cards.env -- \
  docker run -p 9000:9000 -e PAT_1 ghcr.io/stats-forge/github-stats-forge-server
```

One that only prints a value goes through a shell assignment, which keeps it out of the arguments:

```sh
PAT_1="$(aws secretsmanager get-secret-value \
  --secret-id github-cards --query SecretString --output text)" \
  docker run -p 9000:9000 -e PAT_1 ghcr.io/stats-forge/github-stats-forge-server
```

`gcloud secrets versions access latest --secret=github-cards`,
`az keyvault secret show --name github-cards --query value -o tsv` and
`vault kv get -field=token secret/github-cards` substitute in unchanged.

### Kubernetes

`envFrom` puts a whole Secret into the environment, so the manifest never names the token:

```yaml
envFrom:
  - secretRef:
      name: github-cards
```

What makes it KMS-backed is where that Secret comes from:
the External Secrets Operator or the Secrets Store CSI Driver syncs it from AWS Secrets Manager, Google Secret Manager, Azure Key Vault or Vault.

## Which version you run

The image with no tag is `latest`, which moves with every release. Each release also publishes an
exact version and a `major.minor` that follows its patches, so an instance can sit where you put it:

```sh
docker run -p 9000:9000 --env-file cards.env ghcr.io/stats-forge/github-stats-forge-server:0.4
```

The versions are the ones on the
[releases page](https://github.com/stats-forge/github-stats-forge/releases), each carrying the
changelog entry for what moved in it.

## Caching

A card is held for ten hours by default, a failure that might fix itself for ten minutes, and one that will not for an hour.
So a README seen a thousand times costs one GitHub request rather than a thousand,
and the instance stays inside its rate limit without anything being configured.

`?cache_seconds=1800` on a card asks for a shorter life, within the four-hour to twenty-four-hour range a card is clamped to.
`CACHE_SECONDS=0` turns the whole thing off, headers and all, which is what makes an instance debuggable while you are setting it up.

## In a README

The URL is the card, so an image is all it takes:

```md
![your stats](https://cards.example.com/api/stats?username=you&theme=tokyonight)
```

Everything on [In your README](../in-your-readme/) applies unchanged — the two-image light and dark trick, the alignment, the alt text.
The only difference is where the bytes come from.
