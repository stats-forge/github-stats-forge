---
title: GitHub Stats Forge
description: Dynamically generate GitHub stats cards for your READMEs.
template: splash
hero:
  tagline: Your GitHub stats as SVG cards, rendered in your own workflow and committed to your own
    repository. No server between your README and your data.
---

<div class="hero-actions">

[Read the docs](docs/)
[Four ways to draw one](#four-ways-to-draw-one)

</div>

<div class="card-row hero-cards">

![My GitHub stats](/cards/stats.svg)

![The languages I write most](/cards/top-langs-compact.svg)

</div>

## The cards

Contribution stats, the languages you write most, the repositories you contribute to and WakaTime
coding time describe a person; a pinned repository and a pinned gist describe one thing they own;
and two organization cards describe a whole account — what it owns, and what it has been doing
lately. Every one takes the same colours, borders and [themes](docs/customization/themes/), and
each has a light and a dark version.

<div class="card-gallery">

[![The contributed-to card](/cards/contributed-to.svg) Contributed to](docs/cards/contributed-to/)

[![The organization card](/cards/organization.svg) Organization](docs/cards/organization/)

[![The repository pin card](/cards/pin.svg) Repository pin](docs/cards/repo-pin/)

[![The organization activity card](/cards/org-activity.svg) Organization activity](docs/cards/organization-activity/)

[![The gist pin card](/cards/gist.svg) Gist pin](docs/cards/gist-pin/)

[![The top languages card, donut layout](/cards/top-langs-donut.svg) Top languages](docs/cards/top-languages/)

[![The WakaTime card](/cards/wakatime.svg) WakaTime](docs/cards/wakatime/)

</div>

<div class="section-link">

[See every card and its options](docs/)

</div>

## Four ways to draw one

<div class="ways">

<div class="way way--featured">

Recommended

**[The GitHub Action](https://github.com/stats-forge/github-stats-forge-action)**

It renders your cards on a schedule and commits the SVGs, so nothing has to be up when someone
reads your profile and a failure lands in a job log rather than in a broken image.

1. Runs on a schedule
2. Renders your cards
3. Commits the SVGs

</div>

<div class="way">

Try a card

**[The CLI](docs/usage/cli/)**

Asks which card you want and which options it should take, then writes the SVG next to you. It is
how you settle on a card before a workflow keeps it current.

</div>

<div class="way">

Build on it

**[The library](docs/usage/library/)**

What both of those call. It reads no environment of its own, so the same code runs in an action,
on a server and in a browser.

</div>

<div class="way">

Host it

**[Your own server](docs/usage/self-hosting/)**

The one way that does need something up: a container image drawing cards from your own GitHub
tokens the moment someone looks at one, with this site and the card builder inside it.

</div>

</div>

<div class="footnote">

Every card on this site was rendered by the CLI from a saved configuration, so what you see is what
the tool produces — not a screenshot.

</div>
