# @stats-forge/github-stats-forge-catalog

What each [GitHub Stats Forge](https://stats-forge.github.io/github-stats-forge/) card accepts:
every option's query param, label, kind and accepted values, in one list to build a form over.

```sh
npm install @stats-forge/github-stats-forge-catalog
```

```ts
import { findCard } from '@stats-forge/github-stats-forge-catalog';

const card = findCard('stats');

for (const option of card.options) {
  // option.name is the query param, option.label what to call it,
  // option.kind which control to draw, option.choices what it accepts
}
```

It reads its accepted values off
[`@stats-forge/github-stats-forge-core`](https://www.npmjs.com/package/@stats-forge/github-stats-forge-core),
so an option here cannot offer a value that package's api would reject. The CLI's prompts and the
documentation site's card builder are two forms over the same list.

Requires Node `^24 || >=26`.

> [!TIP]
> **[The options, as data](https://stats-forge.github.io/github-stats-forge/docs/usage/library/#the-options-as-data)**
> documents what a card carries, and
> **[the library](https://stats-forge.github.io/github-stats-forge/docs/usage/library/)** the handler `card.render` calls.
