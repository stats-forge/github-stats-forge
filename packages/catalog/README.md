# @stats-forge/github-stats-forge-catalog

What each [GitHub Stats Forge](https://github.com/stats-forge/github-stats-forge) card accepts:
every option's query param, label, kind and accepted values, in one list to build a form over.

```sh
npm add @stats-forge/github-stats-forge-catalog
```

The cards themselves come from
[`@stats-forge/github-stats-forge-core`](https://www.npmjs.com/package/@stats-forge/github-stats-forge-core),
which this package reads its accepted values off — so an option here cannot offer a value that
package's api would reject. It is the list the CLI's prompts and the documentation site's card
builder are both built over, published on its own so that a third form costs core and nothing else.

## What a card carries

```ts
import { findCard } from '@stats-forge/github-stats-forge-catalog';

const card = findCard('stats');
//    ^ { id, label, needsToken, required, options, render }
```

`required` holds the params the card cannot be rendered without — a username, a repository name, a
gist id — and `options` everything else, each one a `{ name, label, kind, group }` with `choices`
and a `hint` where there are any. `name` is the query param it writes, so answers go straight into
a query string.

`kind` says which control to draw: `text`, `boolean`, `choice`, `list`, `number` or `integer`.
Pass it to `numericStep` for the last two — it answers `'any'` or `1`, which is
`<input type="number">`'s own vocabulary, so neither form decides for itself how finely a param
moves.

`group` sorts an option into one of the sections `OPTION_GROUPS` names, in the order to show them.
`COMMON_OPTIONS` is the colors and the theme, which every card accepts; `cards` already carries
them at the front of each card's own `options`, so a form reads one list.

## Rendering one

`render` is the core api handler that draws the card, so a form can preview what it is building:

```ts
import { CardConfig } from '@stats-forge/github-stats-forge-core/api';
import { findCard } from '@stats-forge/github-stats-forge-catalog';

const card = findCard('stats');
const config = new CardConfig({ pats: [{ name: 'PAT_1', value: process.env.PAT_1 ?? '' }] });

const result = await card.render({ username: 'anuraghazra', theme: 'tokyonight' }, config);
if (result.status === 'success') {
  console.log(result.content); // the SVG
}
```

Every card but WakaTime reads the GitHub API, which is what `needsToken` says and what the
`pats` above are for. A failed render is an `ApiResult` carrying the code, the param at fault and
an SVG saying so — see core's own documentation for that shape.

Requires Node 24 or newer.
