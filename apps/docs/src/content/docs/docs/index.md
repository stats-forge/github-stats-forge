---
title: Overview
description: What the cards are, how to draw one, and where the rest of the documentation is.
---

GitHub Stats Forge renders GitHub stats as SVG cards:
your contribution stats, the languages you write most, the repositories you contribute to,
pinned repositories, gists, an organization's totals and WakaTime coding time.

![The stats card](/cards/stats.svg)

Every card on this site was rendered by the CLI from a saved configuration,
so what you see is what the tool produces — not a screenshot.

## The cards

Which card you want starts with what it is about — a person, one repository or gist, or a whole
organization. The anvil and the sidebar group them the same way.

### User

| Card                                    | Handler         | What it shows                                                  |
| --------------------------------------- | --------------- | -------------------------------------------------------------- |
| [Stats](cards/stats/)                   | `stats`         | Commits, PRs, issues, reviews, stars and a rank                |
| [Top languages](cards/top-languages/)   | `topLangs`      | The languages you write most, by size or repository count      |
| [Contributed to](cards/contributed-to/) | `contributedTo` | The repositories you contribute to, ranked, and in which years |
| [WakaTime](cards/wakatime/)             | `wakatime`      | Coding time per language                                       |

### Repository or gist

| Card                              | Handler | What it shows                                      |
| --------------------------------- | ------- | -------------------------------------------------- |
| [Repository pin](cards/repo-pin/) | `pin`   | One repository, so a profile can pin more than six |
| [Gist pin](cards/gist-pin/)       | `gist`  | One gist                                           |

### Organization

| Card                                | Handler | What it shows                                    |
| ----------------------------------- | ------- | ------------------------------------------------ |
| [Organization](cards/organization/) | `org`   | Its public repositories, and what they add up to |

## Getting a card

There are three ways in, and none of them needs a server.

**From a workflow — the recommended one.**
[The GitHub Stats Forge action](https://github.com/stats-forge/github-stats-forge-action) renders
your cards on a schedule and commits the SVGs, so your README points at files in your own
repository. Nothing has to be up when someone reads your profile, and a failure lands in a job log
rather than in a broken image. Its own README documents the inputs it takes.

**From the terminal**, which writes an SVG next to you:

```sh
npx @stats-forge/github-stats-forge-cli
```

It asks which card, asks for the options that card takes, and saves what you answered
so the same card can be redrawn later. See [The CLI](usage/cli/).

**From code**, which is what the action and any self-hosted endpoint do underneath:

```js
import { CardConfig, stats } from '@stats-forge/github-stats-forge-core/api';

const config = new CardConfig({ pats: [{ name: 'PAT_1', value: process.env.PAT_1 }] });
const result = await stats({ username: 'octocat' }, config);
```

See [The library](usage/library/).

**From your own server**, which draws a card at the moment someone looks at it:

```sh
docker run -p 9000:9000 -e PAT_1=github_pat_... ghcr.io/stats-forge/github-stats-forge-server
```

The image serves every card as an endpoint, and carries this documentation and the card builder
with it — the builder drawing from your instance, with your real numbers.
See [Self-hosting](usage/self-hosting/).

## Customizing one

Every card takes the same [colors, borders and title options](customization/common-options/),
one of [79 built-in themes](customization/themes/),
and a [locale](customization/locales/) where it has text to translate.
Each card page lists what only that card accepts.
