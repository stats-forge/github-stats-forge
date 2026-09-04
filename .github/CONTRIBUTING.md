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
```

Card tests assert on the rendered DOM rather than on snapshots,
with one snapshot suite for the WakaTime card. If a change to that card's markup was intentional,
update it:

```bash
pnpm --filter ./packages/core/ run test:update:snapshot
```

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

## Themes Contribution

We have stopped the addition of new themes to decrease maintenance efforts.
If you are considering contributing your theme just because you are using it personally,
then instead of adding it to our theme collection,
you can use the card [customization options](../packages/core/src/cards/options.ts).

## Translations Contribution

GitHub Stats Forge supports multiple languages. If we are missing your language,
you can contribute it!
The currently supported languages are listed in [packages/core/src/translations.ts](../packages/core/src/translations.ts).

To contribute your language you need to edit the [packages/core/src/translations.ts](../packages/core/src/translations.ts) file and add a new property to each object where the key is the language code in [ISO 639-1 standard](https://www.andiamo.co.uk/resources/iso-language-codes/) and the value is the translated string.

## Any contributions you make will be under the MIT Software License

In short, when you submit changes,
your submissions are understood to be under the same [MIT License](https://choosealicense.com/licenses/mit/) that covers the project.
Feel free to contact the maintainers if that's a concern.

## Report issues/bugs using GitHub's issues

We use GitHub issues to track public bugs.
Report a bug by [opening a new issue](https://github.com/stats-forge/github-stats-forge/issues/new/choose).
If there is already an open issue for your bug in the upstream repo [github-readme-stats](https://github.com/anuraghazra/github-readme-stats/issues) you don't need to report it here.

## Feature Request

**Great Feature Requests** tend to have:

- A quick idea summary
- What & why do you want to add the specific feature
- Additional context like images, links to resources to implement the feature, etc.
