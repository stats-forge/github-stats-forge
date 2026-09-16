---
name: add-card
description: Add a new card to github-stats-forge, end to end — GraphQL query, fetcher, renderer, locales, api handler, CLI catalog, server route, anvil entry, documentation pages and tests. Use when asked to add, build or scaffold a card, a new endpoint that draws one, or a fetcher behind one. Also covers adding an option to an existing card.
---

# Adding a card

A card is not one file. It is a renderer plus a fetcher plus a handler, and then a dozen
other files that each hold their own copy of "every card there is".

**Four of those copies are guarded and the rest are not.** `tests/routes.spec.ts` fails if the
server does not route the card, the anvil throws if it has no `EXTRAS` entry, the docs build
fails if the fetcher has no page, and `e2e/anvil.spec.ts` fails if the card picker's list is
short. Everything else — the CLI catalog, the sidebar, the four documentation tables — is
silent when you forget it: the card simply is not there, and nobody finds out until someone
goes looking for it.

Work top to bottom. Each step's output is the next step's input, and the checks at the end
are not optional.

## Before anything: settle the shape

Two decisions cost the most to change later, so make them first and say them out loud.

- **What it costs.** Probe the real API before designing the query, with `PAT_1` from the
  root `.env`. GitHub charges a GraphQL request by the nodes it asks for, so several
  aliased `search` fields cost the same single point as one — which is why a card whose
  figures are all searches should be one static operation rather than a document assembled
  per `show`. A figure that needs a second request (commits, which have no GraphQL search
  index) belongs behind `show`, with the handler deriving the fetcher's flag from it.
- **The category.** `user`, `repo` or `org`. It picks the anvil's heading and which half of
  every theme pair the card wears, and it decides where the card sorts in five different
  lists.

Read `packages/core/AGENTS.md` and `packages/core/src/cards/AGENTS.md` now, not later:
the api layer is a trust boundary with rules about where parsing, defaulting and validation
each belong, and the cards have their own about branding and translated text.

## 1. The data

1. `packages/core/src/graphql/queries/<card>.graphql` — query text never lives in a fetcher.
   Then `pnpm --filter ./packages/core/ run generate-graphql-types`, which writes
   `src/graphql/generated/<card>.ts`. Never hand-edit generated files.
2. `packages/core/src/fetchers/types.ts` — the data shape the card draws from. Document each
   member inline with `/** */`; a `null` that means "not asked for" needs saying.
3. `packages/core/src/fetchers/<card>.ts` — the fetcher. It validates the shape of anything
   that reaches a URL (a GitHub login against `GITHUB_USERNAME_PATTERN`), because
   `./fetchers` is a public export.
4. `packages/core/src/fetchers/index.ts` — export the function **and** its types.

## 2. The card

5. `packages/core/src/cards/<card>/locales.ts` — every user-visible string, `en` only.
   A new key is never machine-translated into the other 47 locales.
6. `packages/core/src/cards/<card>/index.ts` — the renderer, ending in
   `Object.assign(renderCard, { OPTIONS: { … } })` so a list cannot be found without what
   draws it.
7. `packages/core/src/common/brand.ts` — one entry in `CARD_ICON`. **Check the icon exists**
   in `common/icons.ts` and is not already worn by another card; do not invent an octicon
   path you cannot verify, and do not repaint an existing card's mark to free one up.

## 3. The boundary

8. `packages/core/src/api/<card>.ts` — a `zod/mini` schema built from `api/params.ts`, then
   `cardHandler(query, identities, handler)`. The second argument is the allowlist map, and
   naming a param the schema does not declare is a compile error.
9. `packages/core/src/api/index.ts` — export the handler.

## 4. The five lists

Each of these is a separate file holding its own copy of "every card there is".

10. `packages/cli/src/cards.ts` — the catalog entry. `choices` always reads
    `<handler>.OPTIONS.<param>`, never a literal. Every option needs a `group`.
    A numeric option is `integer` or `number` according to how **core** reads it —
    `looseIntParam` is an integer, `numberParam` a number.
11. `apps/server/src/routes.ts` — the path, and the count in its `@file` block.
12. `apps/docs/src/anvil/cards.ts` — the `EXTRAS` entry: `docs` slug, `category`, `identity`
    seeds and `maximal`, the params that turn on everything the recorder must capture.
13. `apps/docs/astro.config.ts` — **two** sidebar entries, the card page and the fetcher page.
14. The four tables: `docs/index.md`, `docs/fetchers/overview.md`,
    `docs/usage/self-hosting.md` and `apps/server/README.md`.

## 5. The documentation

15. `apps/docs/src/content/docs/docs/cards/<slug>.md` — the slug is reader-facing and differs
    from the card id (`pin` is `repo-pin`). Required params, an options table, and a section
    per thing the card is easy to misread about.
16. `apps/docs/src/content/docs/docs/fetchers/fetch-<name>.md` — **the docs build fails
    without this**, naming the file to write. It carries `<!-- api: fetchName -->`, which is
    expanded at build time; the prose around it is hand-written.
17. `apps/docs/cards/<card>.json` — a saved card, no theme. Then `pnpm docs:cards`.
18. `pnpm --filter ./apps/docs run record-anvil-samples` — needs `PAT_1`.

**Both generators rewrite every card's output, not just the new one.** The committed SVGs
and `samples.json` carry live numbers that drift on their own, so re-recording them all puts
a dozen unrelated files in your diff. Keep only what is new: `git checkout --` the previews
you did not add, and merge the two new keys into `samples.json` rather than taking the whole
re-recording.

## 6. The tests

19. `packages/core/tests/fetch<Name>.spec.ts` — `FetchMock` plus `testConfig`. If the fetcher
    reads the clock, `vi.setSystemTime` is what makes its requests assertable.
20. `packages/core/tests/render<Name>Card.spec.ts` — assert on the DOM with jest-dom matchers.
    Never `expect(queryByTestId(…)).toBeDefined()`; `null` is defined.
21. `packages/core/tests/locales.spec.ts` — add the table to the list it walks.
22. `packages/core/tests/accessibility.spec.ts` — add the card to its `cards` map.
23. `apps/docs/e2e/anvil.spec.ts` — the card-picker assertion spells out every id in order.
    **This one fails only in `pnpm docs:e2e`**, at the end of `check-all`.

## 7. Landing it

24. A changeset naming **core, cli and server** — the server because the image ships the
    documentation site, so a visitor-facing docs change is a change to what it publishes.
    First line is a conventional commit and lands verbatim in the changelog.
    Confirm with `pnpm exec changeset status`.
25. The card counts in the `AGENTS.md` files — `grep -rln "seven\|eight" --include=AGENTS.md -r .`.
    Several rules are written as "all seven cards do this".
26. `pnpm check-all`. Twelve checks; the ones this work usually trips are **knip** (an export
    nothing imports — drop it rather than exporting it for its own sake), **lint**
    (`prefer-destructuring`), **format** (run `pnpm format` twice; one pass can leave work
    for the next) and **anvil e2e**.

## Adding an option to an existing card instead

Five places, and the anvil is free:

- the renderer's `OPTIONS`, if the option names a closed set of values
- the card's own options interface and its destructuring, where the **default** lives
- the api schema in `packages/core/src/api/<card>.ts` — parse, never default
- `packages/cli/src/cards.ts`, with `choices` read off the handler
- the options table on the card's documentation page

The anvil builds its control from the CLI catalog, so it needs nothing. If the option changes
_what is fetched_ rather than what is drawn, add it to that card's `maximal` in
`apps/docs/src/anvil/cards.ts` and re-record the samples.
