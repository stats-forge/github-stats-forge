---
title: Card wizard
description: Build a card in the browser and take away the file the CLI renders it from.
template: splash
---

:::caution[Not built yet]
The wizard is the next thing being worked on. This page is where it will live.
:::

It will be a form over every option each card takes, with the card redrawn beside it as you change
one, and no GitHub token needed — the preview renders from sample data in your browser, so nothing
you type is sent anywhere.

What you take away is the file the CLI already reads:

```sh
npx @stats-forge/github-stats-forge-cli --config card.json --generate
```

Until then, the same questions are asked in the terminal by [the CLI](../docs/usage/cli/).
Every option is documented under [Cards](../docs/cards/stats/) and
[Customization](../docs/customization/common-options/).
