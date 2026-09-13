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
[The GitHub Action](https://github.com/stats-forge/github-stats-forge-action)

</div>

<div class="card-row">

![My GitHub stats](/cards/stats.svg)

![The languages I write most](/cards/top-langs-compact.svg)

</div>

## The cards

Contribution stats, the languages you write most, the repositories you contribute to and WakaTime
coding time describe a person; a pinned repository and a pinned gist describe one thing they own;
the organization card describes a whole account. Every one takes the same colours, borders and
[79 themes](docs/customization/themes/), and each has a light and a dark version.
[See them all](docs/).

## Four ways to draw one

**[The GitHub Action](https://github.com/stats-forge/github-stats-forge-action)** is the recommended
one. It renders your cards on a schedule and commits the SVGs, so nothing has to be up when someone
reads your profile and a failure lands in a job log rather than in a broken image.

**[The CLI](docs/usage/cli/)** asks which card you want and which options it should take, then
writes the SVG next to you. It is how you settle on a card before a workflow keeps it current.

**[The library](docs/usage/library/)** is what both of those call. It reads no environment of its
own, so the same code runs in an action, on a server and in a browser.

**[Your own server](docs/usage/self-hosting/)** is the one way that does need something up. It is a
container image — cards drawn from your own GitHub tokens at the moment someone looks at one, with
this site and the card builder inside it, the builder then drawing from your instance and your real
numbers.

Every card on this site was rendered by the CLI from a saved configuration, so what you see is what
the tool produces — not a screenshot.
