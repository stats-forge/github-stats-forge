# The cards

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

After any card edit, redraw the previews (`pnpm docs:cards`) and diff the snapshots — see the
root `AGENTS.md`.

## Card text and translations

- **No user-visible string is written in English at its use site** ([#49]). Every word a card
  draws — label, title, empty state, fallback, and the `<desc>` a screen reader gets — comes from
  the card's own locale table. A string reaching the SVG without passing through `t` is the bug.
- **Error card text is the known exception.** `CardError` and `REJECTION_MESSAGES` are English on
  purpose: an error can be thrown before, or because, the locale was parsed. Translating one is its
  own decision.
- **A new key is written in `en` only** ([#49]). A wording falls back to its `en` string where a
  locale has none; machine-translating every locale is worse than an honest fallback.
- **A card whose text is translated takes `locale`** — in its options, its handler's schema and the
  catalog's option list. The three move together.
- **A card draws its wordings through `localize`, and names each one where it draws it** ([#65]):
  `const t = localize(statCardLocales, locale)`, then `t.totalStars()`. A property access is
  something an editor can follow to the table; a string key is not. So **a key carries no card
  name in front of it**.
  - **A helper that draws takes `Localized<typeof xCardLocales>`, spelled out.** Don't invent a
    per-card alias; if one ever earns its keep, mirror `Localized`, not `Locale` — that word is the
    language tag.
  - **Keys are camelCase**, because `typescript/dot-notation` demands dot access wherever a key
    allows it.
  - **Two cards' tables are never merged**: their `title` keys collide and the intersection reduces
    `en` to `never`. A card reading two tables localizes each separately.
  - **`common/locales.ts` holds the wordings more than one card draws**, read as `commonT` beside the
    card's own `t`. A card never imports another card's table.
- **A locale table is data, declared with `defineLocales`** ([#61]). The `<const Table>` identity
  keeps each string's literal type, which is what lets a wording reject a call missing a value it
  declares.
  - **`satisfies LocaleTable` is not a replacement, and fails silently**: it widens the strings and
    every placeholder check disappears. `as const satisfies LocaleTable` is the only other form that
    works.
- **The word order is the translation's, and so is which placeholders it uses.** A locale may name
  fewer than `en`, never one `en` does not supply; `tests/locales.spec.ts` checks that, and every
  locale name against `AVAILABLE_LOCALES`.
- **A wording that depends on a number is plural forms, not assembled** ([#61]):
  `{ one: '{count} repository', other: '{count} repositories' }`, picked by `Intl.PluralRules` for
  the locale the wording came from.
- **A whole phrase is one key, not a `label: value` pair assembled in the card**, so a translation
  can move the parts.
  - **The parenthesised year is the remaining exception — don't "fix" it.** Both halves are
    translated in every locale; one new whole-phrase key would be `en` only, and regress them all
    to English. It is worth doing once the parenthetical has its own translated key.
- **The error card's report line sits under the message because it was measured not to fit beside
  the title** ([#58]). Re-measure in a canvas before moving it. It carries `data-testid="report"`,
  and is omitted for an upstream failure or when `show_repo_link` is off.

## Card branding

- **`common/brand.ts` owns how a card looks; a card composes from it** ([#51]). One font stack, one
  type scale, one weight table, the default widths and each card's icon. A card writing a `font`
  shorthand, a pixel size or a raw weight is drifting.
- **Every measure is one `CARD_STYLE` const, read with dot notation** ([#123]) —
  `CARD_STYLE.width.wide`, `CARD_STYLE.padding.bottom`. Only `CARD_ICON`, `font` and
  `firefoxFontSize` stand beside it, so a card's brand import stays one line and a new measure is
  added there rather than redeclared locally.
- **A default width is `CARD_STYLE.width.compact`, `.standard` or `.wide`.** A layout needing more
  room takes the next step up rather than adding to one, so cards stacked in a README share an edge.
  - **Raising a step can strand a minimum beneath it**: a floor meets its default only through
    `Math.max`. Re-check the floors whenever a step moves.
  - **A card's own slack absorbs its extras, so the default lands on the grid.** Only
    `minCardWidth`, which has no slack, makes room for the stats card's icons.
- **The title icon is `.title-icon`, not `.icon`.** The stats card hides `.icon` when `show_icons` is
  off, which would hide a title icon sharing the class. It and the rule beneath it take
  `iconColor`, so they read against the title rather than dissolving into it.
- **The header is a band, a title, an icon and a rule under that icon** ([#51]). `Card` draws the
  band, since it spans the card: its top corners take `border_radius` and its foot stays square.
  `hide_title` drops the lot.
- **The band's foot and the body are one subtraction apart, never two constants**: it ends at
  `bodyOffset - CARD_STYLE.band.gap`, so the air under the header cannot silently close up.
- **`paddingY` is 30 and the body still starts at 55**, so moving the title did not move anything
  below the header.
- **Each card's icon is distinct, and `CARD_ICON` is the one table.** A card must be identifiable
  from its header.
- **A card's height is its content plus `CARD_STYLE.padding.bottom`, never a spare row** ([#123]).
  A spare row made the bottom gap scale with the row spacing while the top did not. **Measure both
  ends across all the cards before trusting a layout constant**: drift is invisible in one card.
- **Two things that move with a width are derived from it the same way.** The stats card's rank ring
  and its values both come off `RANK_GUTTER`; interpolating one and scaling the other made them
  overlap.
  - **The same holds for a width and a height** ([#219]): the donut's ring is a fixed size, and its
    card height is derived from it and the list.

[#49]: https://github.com/stats-forge/github-stats-forge/pull/49
[#51]: https://github.com/stats-forge/github-stats-forge/pull/51
[#58]: https://github.com/stats-forge/github-stats-forge/pull/58
[#61]: https://github.com/stats-forge/github-stats-forge/pull/61
[#65]: https://github.com/stats-forge/github-stats-forge/pull/65
[#123]: https://github.com/stats-forge/github-stats-forge/pull/123
[#219]: https://github.com/stats-forge/github-stats-forge/pull/219
