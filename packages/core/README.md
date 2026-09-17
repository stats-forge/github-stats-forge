# @stats-forge/github-stats-forge-core

The library behind [GitHub Stats Forge](https://stats-forge.github.io/github-stats-forge/):
it turns GitHub and WakaTime data into SVG cards.

Nothing here reads the environment or the filesystem — you pass a config in, you get a string of
SVG back — so it behaves the same under Node, in a browser and under a test runner. It is what the
CLI, the action and every self-hosted instance call.

```sh
npm install @stats-forge/github-stats-forge-core
```

```ts
import { CardConfig, stats } from '@stats-forge/github-stats-forge-core/api';

const config = new CardConfig({ pats: [{ name: 'PAT_1', value: process.env.PAT_1! }] });

const result = await stats({ username: 'anuraghazra', theme: 'tokyonight' }, config);

// `content` is an SVG either way: a failure is a card that says what went wrong.
response.setHeader('Content-Type', 'image/svg+xml');
response.end(result.content);
```

Requires Node `^24 || >=26`.

> [!TIP]
> **[The library](https://stats-forge.github.io/github-stats-forge/docs/usage/library/)** documents the handlers,
> `CardConfig`, the error codes and the entry points.
> [Every card](https://stats-forge.github.io/github-stats-forge/docs/) has a page of its own.

## Acknowledgements

It continues the work of [github-stats-extended](https://github.com/stats-organization/github-stats-extended),
which is itself based on [github-readme-stats](https://github.com/anuraghazra/github-readme-stats).
