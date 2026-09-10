# Contributing to GitHub Stats Forge

## Local Development

```bash
pnpm install
pnpm run build:packages
```

The library talks to the GitHub API through the tokens its caller passes in,
so anything that actually fetches needs a [Personal Access Token](https://github.com/settings/personal-access-tokens) of your own —
the tests do not, they run against recorded responses.

## Tests

```bash
pnpm run test       # unit tests
pnpm run lint       # oxlint
pnpm run typecheck  # tsc
pnpm check-all      # every check CI runs, cheapest failure first
```

`check-all` is the one to reach for before opening a pull request:
it runs the list above and the rest of CI in one command, stopping at the first failure.

Card tests assert on the rendered DOM rather than on snapshots,
with one snapshot suite for the WakaTime card.
If a change to that card's markup was intentional, update it:

```bash
pnpm --filter ./packages/core/ run test:update:snapshot
```

## The Server

```bash
pnpm server:standalone   # the cards alone, against the root .env, restarting on every edit
pnpm server:hosted       # build the documentation site as the image does, then serve it too
```

Both read `PAT_1` from a `.env` at the repository root; without it every card but WakaTime draws the `no_tokens` error.
The hosted one serves the built site as a snapshot, so an edit to a page or to the anvil needs the command run again.

## The Documentation Site

```bash
pnpm run docs     # the site's dev server — the `run` is required, `pnpm docs` is a pnpm builtin
pnpm docs:cards   # redraw the card previews the pages show
```

The previews are committed, so redraw them when a card's output changes.
That needs `PAT_1` in the root `.env`, which is why CI cannot keep them current.

## GraphQL Queries

The GraphQL queries live in `packages/core/src/graphql/queries/*.graphql`,
and their TypeScript types are generated from GitHub's published schema into `packages/core/src/graphql/generated/`.
Those generated files are committed, so if you change a query,
regenerate them and include the result in your PR:

```bash
pnpm --filter ./packages/core/ run generate-graphql-types
```

CI runs `pnpm --filter ./packages/core/ run check-graphql-types`,
which fails if the committed types no longer match the queries.
Never edit the generated files by hand — change the `.graphql` file and regenerate.

## Workflows That Commit

`pnpm install` installs a lefthook `pre-commit` hook that formats, lints and tests.
A workflow that commits sets `LEFTHOOK: 0` to skip it:
the lint needs the types `astro sync` writes into `apps/docs/.astro`, which a fresh checkout has not.
The pull request it opens runs the full CI anyway.

## Themes Contribution

We have stopped the addition of new themes to decrease maintenance efforts.
If you are considering contributing your theme just because you are using it personally,
then instead of adding it to our theme collection,
you can use the card [customization options](../packages/core/src/cards/options.ts).

## Translations Contribution

GitHub Stats Forge supports multiple languages.
If we are missing your language, you can contribute it!

Each card owns its wordings in the `locales.ts` beside its renderer —
[cards/stats/locales.ts](../packages/core/src/cards/stats/locales.ts) and so on,
with [common/locales.ts](../packages/core/src/common/locales.ts) for the few more than one card draws.
Add your language code to each key, using the code listed in `AVAILABLE_LOCALES`
in [common/localize.ts](../packages/core/src/common/localize.ts):

```ts
title: {
  en: `{name}'{apostrophe} GitHub Stats`,
  it: `Statistiche GitHub di {name}`,
},
```

A table doesn't need to be complete — a missing wording falls back to `en`,
so translating one key is still worth a pull request.
Keep the `{name}` placeholders: you may use fewer than `en` does,
but never one it does not supply.
A wording that depends on a number is written as plural forms instead:

```ts
{ one: '{count} repository', other: '{count} repositories' }
```

and `Intl.PluralRules` picks the form for your language.

`pnpm run test` checks all of that.

## Any contributions you make will be under the MIT Software License

In short, when you submit changes,
your submissions are understood to be under the same [MIT License](https://choosealicense.com/licenses/mit/) that covers the project.
Feel free to contact the maintainers if that's a concern.

## Report issues/bugs using GitHub's issues

We use GitHub issues to track public bugs.
Report a bug by [opening a new issue](https://github.com/stats-forge/github-stats-forge/issues/new/choose).

## Feature Request

**Great Feature Requests** tend to have:

- A quick idea summary
- What & why do you want to add the specific feature
- Additional context like images, links to resources to implement the feature, etc.
