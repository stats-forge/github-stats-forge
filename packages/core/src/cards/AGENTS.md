# The cards

> Scoped to this tree; the repo-wide rules are in the root `AGENTS.md`.

After any card edit, redraw the previews (`pnpm docs:cards`) and diff the snapshots.

## Card text and translations

- **Every word a card draws comes from its locale table** ([#49]): labels, titles, empty states,
  fallbacks and the `<desc>`. A string reaching the SVG without `t` is the bug. Error text
  (`CardError`, `REJECTION_MESSAGES`) is English on purpose, since it can precede the locale's parse.
- **A new key is written in `en` only** ([#49]); a locale falls back to it, which beats a machine
  translation.
- **A translated card takes `locale: Locale`** in its options, its schema and the catalog, together.
- **Draw through `localize`, naming each wording where it is drawn** ([#65]):
  `const t = localize(statCardLocales, locale)`, then `t.totalStars()`. Keys are camelCase and carry
  no card name.
  - A drawing helper takes `Localized<typeof xCardLocales>`, spelled out. Don't invent a per-card
    alias; if one ever earns its keep, mirror `Localized`, not `Locale`, which is the language tag.
  - **Two cards' tables are never merged**: their `title` keys collide. Shared wordings live in
    `common/locales.ts`, read as `commonT`; a card never imports another card's table.
- **A table is declared with `defineLocales`** ([#61]), whose `<const Table>` keeps the literals that
  check placeholders. `satisfies LocaleTable` silently drops that check; only
  `as const satisfies LocaleTable` also works. It refuses a code `AVAILABLE_LOCALES` does not list,
  an alias included, since the api resolves an alias before a card reads it.
- **A translation owns its word order and placeholders**: it may use fewer than `en`, never others.
  `tests/locales.spec.ts` checks that.
- **A number-dependent wording is plural forms** ([#61]), `{ one, other }` picked by
  `Intl.PluralRules` for the locale the wording came from, and **a whole phrase is one key**, never
  a `label: value` assembled in the card. The parenthesised year is the exception: leave it until
  the parenthetical has its own translated key, or every locale regresses to English.
- **The error card's report line sits under the message, measured not to fit beside the title**
  ([#58]); re-measure in a canvas before moving it. It is `data-testid="report"`, drawn when the
  failure's `CardError.reportable` is on, which a `not_found` never is.

## Card branding

- **`common/brand.ts` owns how a card looks** ([#51]): the font stack, type scale, weights, default
  widths and icons. A card writing its own `font`, pixel size or weight is drifting.
- **Every measure is a `CARD_STYLE` entry, read by dot** ([#123]); only `CARD_ICON`, `font` and
  `firefoxFontSize` stand beside it. A new measure goes there, never into a card.
- **Every side offset reads `CARD_STYLE.padding.x`, never a literal**: when it moved from 25 to
  18, each hard-coded 25 left a row, a bar or a value off the new edge.
- **A default width is a `CARD_STYLE.width` step**; a layout needing more takes the next step, so
  stacked cards share an edge. A minimum meets its default only through `Math.max`, so re-check the
  floors when a step moves. A card's slack absorbs its extras; only `minCardWidth` adds room, for the
  stats icons.
- **The header is an icon, a title in the heat's middle stop and the heat trail under them, over a
  band filled with the heat** ([#51]). The band's top corners follow the card's; the trail starts under
  the icon and fades past the title's drawn width, capped to the card; `hide_title` drops it all.
  A corner glow, the card's own shape, sits behind the body.
- **`Card` defines the heat once, as `url(#heat…)` paints in `HEAT_PAINT`**, and a card fills with
  those, never its own gradient. Each stop is classed, so the dark block recolors it with
  `stop-color`; a stop's light color stays its attribute, the fallback.
- **Text is never filled with a gradient** ([#386]): WebKit draws gradient-filled text in an
  `<img>` at 1x, blurring it on a retina screen, and a `clipPath` or `mask` blurs the same. Shapes
  keep the gradients, which it draws sharp.
- **What glows is drawn twice, through `glowingCircle`: the bloom alone behind, the shape unfiltered
  over it** ([#390]). WebKit draws a filtered shape at 1x too, so `HEAT_PAINT.bloom` is a blur with
  no `SourceGraphic` in it.
- **A chart split by language keeps GitHub's language colors**; only a bar measuring one share,
  as on the WakaTime card's normal layout or the activity card's flow rows, burns in the heat.
- **A `quiet` theme drops the corner glow and halves the band**, for the original palettes.
- **The title icon is `.title-icon`, not `.icon`**, which the stats card hides; it takes
  `iconColor`, the heat's middle stop unless set. **Each card's icon is distinct, from the one
  `CARD_ICON` table.**
- **A card's height is its content plus `CARD_STYLE.padding.bottom`, never a spare row** ([#123]).
  Measure both ends across every card before trusting a layout constant.
- **Two things moving with one width are derived from it the same way**, as the rank ring and the
  values both come off `RANK_GUTTER`; so are a width and a height ([#219]), the donut's card height
  following its fixed ring and its list.
- **An animation fills `backwards` over a base style that is its last frame** ([#311]), never
  `forwards` from a hidden one: a renderer that skips animations still draws the whole card.

[#49]: https://github.com/stats-forge/github-stats-forge/pull/49
[#51]: https://github.com/stats-forge/github-stats-forge/pull/51
[#58]: https://github.com/stats-forge/github-stats-forge/pull/58
[#61]: https://github.com/stats-forge/github-stats-forge/pull/61
[#65]: https://github.com/stats-forge/github-stats-forge/pull/65
[#123]: https://github.com/stats-forge/github-stats-forge/pull/123
[#219]: https://github.com/stats-forge/github-stats-forge/pull/219
[#311]: https://github.com/stats-forge/github-stats-forge/pull/311
[#386]: https://github.com/stats-forge/github-stats-forge/pull/386
[#390]: https://github.com/stats-forge/github-stats-forge/pull/390
