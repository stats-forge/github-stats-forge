# The cards

> Scoped to this tree; the repo-wide rules are in the root `AGENTS.md`.

## Card text and translations

- **Every word a card draws comes from its locale table** ([#49]): labels, titles, empty states,
  fallbacks and the `<desc>`. A string reaching the SVG without `t` is the bug. Error text
  (`CardError`, `REJECTION_MESSAGES`) is English on purpose, since it can precede the locale's parse.
- **A new key is written in `en` only** ([#49]); a locale falls back to it, which beats a machine
  translation.
- **A translated card takes `locale`** in its options, its schema and the catalog, together.
- **Draw through `localize`, naming each wording where it is drawn** ([#65]):
  `const t = localize(statCardLocales, locale)`, then `t.totalStars()`. Keys are camelCase and carry
  no card name.
  - A drawing helper takes `Localized<typeof xCardLocales>`, spelled out, never a per-card alias.
  - **Two cards' tables are never merged**: their `title` keys collide. Shared wordings live in
    `common/locales.ts`, read as `commonT`; a card never imports another card's table.
- **A table is declared with `defineLocales`** ([#61]), whose `<const Table>` keeps the literals that
  check placeholders. `satisfies LocaleTable` silently drops that check; only
  `as const satisfies LocaleTable` also works.
- **A translation owns its word order and placeholders**: it may use fewer than `en`, never others.
  `tests/locales.spec.ts` checks that, and every locale name.
- **A number-dependent wording is plural forms** ([#61]), `{ one, other }` picked by
  `Intl.PluralRules`, and **a whole phrase is one key**, never a `label: value` assembled in the card.
  The parenthesised year is the exception: leave it until the parenthetical has its own translated
  key, or every locale regresses to English.
- **The error card's report line sits under the message, measured not to fit beside the title**
  ([#58]); re-measure in a canvas before moving it. It is `data-testid="report"`, drawn when the
  failure's `CardError.reportable` is on.

## Card branding

- **`common/brand.ts` owns how a card looks** ([#51]): the font stack, type scale, weights, default
  widths and icons. A card writing its own `font`, pixel size or weight is drifting.
- **Every measure is a `CARD_STYLE` entry, read by dot** ([#123]); only `CARD_ICON`, `font` and
  `firefoxFontSize` stand beside it. A new measure goes there, never into a card.
- **A default width is a `CARD_STYLE.width` step**; a layout needing more takes the next step, so
  stacked cards share an edge. A minimum meets its default only through `Math.max`, so re-check the
  floors when a step moves. A card's slack absorbs its extras; only `minCardWidth` adds room, for the
  stats icons.
- **The header is a band, a title, an icon and a rule** ([#51]). `Card` draws the band, its top
  corners taking `border_radius`, and `hide_title` drops it all. The band ends at
  `bodyOffset - CARD_STYLE.band.gap`, one subtraction so the gap cannot close; `paddingY` is 30 and
  the body still starts at 55.
- **The title icon is `.title-icon`, not `.icon`**, which the stats card hides; it and its rule take
  `iconColor`. **Each card's icon is distinct, from the one `CARD_ICON` table.**
- **A card's height is its content plus `CARD_STYLE.padding.bottom`, never a spare row** ([#123]).
  Measure both ends across every card before trusting a layout constant.
- **Two things moving with one width are derived from it the same way**, as the rank ring and the
  values both come off `RANK_GUTTER`; so are a width and a height ([#219]), the donut's card height
  following its fixed ring and its list.

[#49]: https://github.com/stats-forge/github-stats-forge/pull/49
[#51]: https://github.com/stats-forge/github-stats-forge/pull/51
[#58]: https://github.com/stats-forge/github-stats-forge/pull/58
[#61]: https://github.com/stats-forge/github-stats-forge/pull/61
[#65]: https://github.com/stats-forge/github-stats-forge/pull/65
[#123]: https://github.com/stats-forge/github-stats-forge/pull/123
[#219]: https://github.com/stats-forge/github-stats-forge/pull/219
