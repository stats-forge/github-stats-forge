---
title: Overview
description: What the cards are, how to draw one, and where the rest of the documentation is.
---

GitHub Stats Forge renders GitHub stats as SVG cards.

![The stats card](/cards/stats.svg)

## The cards

Grouped by what a card is about, as the sidebar and the anvil group them.

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

| Card                                                  | Handler       | What it shows                                    |
| ----------------------------------------------------- | ------------- | ------------------------------------------------ |
| [Organization](cards/organization/)                   | `org`         | Its public repositories, and what they add up to |
| [Organization activity](cards/organization-activity/) | `orgActivity` | PRs, issues and commits over a rolling window    |

## Getting a card

**[The GitHub Stats Forge action](https://github.com/stats-forge/github-stats-forge-action)** is
the recommended way: it renders your cards on a schedule and commits the SVGs, so nothing has to be
up when someone reads your profile.

**[The CLI](usage/cli/)** writes an SVG next to you, and is how you settle on a card's options:

```sh
npx @stats-forge/github-stats-forge-cli
```

**[The library](usage/library/)** is what the action and the CLI call:

```js
import { CardConfig, stats } from '@stats-forge/github-stats-forge-core/api';

const config = new CardConfig({ pats: [{ name: 'PAT_1', value: process.env.PAT_1 }] });
const result = await stats({ username: 'octocat' }, config);
```

**[Your own server](usage/self-hosting/)** draws a card the moment someone looks at it, and serves
this site and the card builder with your real numbers:

```sh
docker run -p 9000:9000 --env-file cards.env ghcr.io/stats-forge/github-stats-forge-server
```

Every card but WakaTime needs a [GitHub token](usage/tokens/).

## Customizing one

Every card takes the same [colors, borders and title options](customization/common-options/),
one of the [built-in themes](customization/themes/),
and a [locale](customization/locales/) where it has text to translate.
Each card page lists what only that card accepts.
