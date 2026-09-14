# The cards

> Directory-scoped rules, loaded when work touches this tree.
> The repo-wide rules — commands, working agreements, comments, linting,
> dependencies, TypeScript and testing — are in the root `AGENTS.md`.

## Card branding

**`common/brand.ts` owns how a card looks; a card composes from it.** One font stack, one
type scale (`display` 22 through `micro` 11), one weight table, the three default widths and
the icon each card wears. `CARD_STYLE.titleFirefoxSize` is the one size off the scale and
still lives there, so "every size a card draws comes from `brand.ts`" holds without an
exception to remember. A card that writes a `font` shorthand, a pixel size or a raw weight
is drifting: before this landed on 2026-09-06 there were three font stacks — two of them
inside the same card — and `.bold` meant 700 on three cards and 600 on a fourth.

**Every measure is one `CARD_STYLE` const, read with dot notation.**
`CARD_STYLE.width.wide`, `CARD_STYLE.fontSize.body`, `CARD_STYLE.padding.bottom`,
`CARD_STYLE.band.gap`, `CARD_STYLE.accent.y`, `CARD_STYLE.statRowInk`. They were eight
top-level exports until 2026-09-14, and a card that wanted three of them opened its file
with an eight-line import — so a new measure was cheaper to redeclare locally than to add.
Only `CARD_ICON`, `font` and `firefoxFontSize` stand beside it, which keeps every card's
brand import to one line.

- **A default width is `CARD_STYLE.width.compact`, `.standard` or `.wide` — 300, 400 or 500.**
  Six cards had five default widths (287, 300, 400, 450, 495) and stacked in a README they
  formed a ragged edge. A layout needing more room takes the next step up rather than adding
  to one: the `donut` moved to `standard` instead of keeping its `+= 50`.
  - **Raising a step can strand the minimum beneath it.** A minimum only ever meets its
    default through `Math.max`, so once the ranked stats layouts moved to 500 and 300 their
    420 and 290 floors could no longer change any output, and were deleted. Only a card sized
    from its own title can still outgrow its step. Re-check the floors whenever a step moves.
  - **A card's own slack absorbs its extras, so the default lands on the grid.** The stats
    card added `iconWidth` to its default and came out 17px off; the icons now ride inside the
    step, and only `minCardWidth`, which has no slack, still makes room for them.
- **The title icon is `.title-icon`, not `.icon`.** `.icon` is the stat icon, and the stats
  card sets `display: none` on it when `show_icons` is false — a title icon sharing that class
  vanishes on the card's own default. It takes `iconColor`, and so does the rule beneath it,
  so the two read against the title rather than dissolving into it.
- **The header is a band, a title, an icon and a rule under that icon, in that order.** The
  band is drawn by `Card` rather than by the title group, because it spans the card: its top
  corners take the card's own `border_radius` and its foot stays square, so it meets the body
  as an edge. `hide_title` drops the lot.
- **The band's foot and the body are one subtraction apart, never two constants.** It ends at
  `bodyOffset - CARD_STYLE.band.gap`, and `bodyOffset` is the single place that says where
  the body starts, so the air under the header cannot silently close up. It did close up once: the band
  first ran the full `bodyOffset` and met the first row of content with nothing between them.
- **`paddingY` is 30, and the body still starts at 55.** The title used to sit at 35 with the
  body 20 below it, which left the header top-heavy inside the band; moving the title up while
  holding `paddingY + 25` kept every card's body exactly where it was, so nothing below the
  header had to be re-measured.
- **Each card's icon is distinct, and the mapping is one table.** `CARD_ICON` in `brand.ts`,
  keyed by card. `repo` and `contributedTo` both passed `icons.contribs` — the repo glyph — and
  three cards had no icon at all, so a card was not identifiable from its header.
- **A card's height is its content plus `CARD_STYLE.padding.bottom`, never a spare row.** Six cards
  sized themselves as `45 + (n + 1) * lheight`, whose extra line landed under the last row as
  bottom padding — so the gap scaled with `line_height` while the 17px above the title did not.
  Measured on the committed previews on 2026-09-14 it ran 22px on wakatime, 24px on the three
  stat cards and 33px on top-languages normal, against a top of 17 everywhere. Height is now
  `CARD_STYLE.padding.bodyOffsetY + rows + ink + CARD_STYLE.padding.bottom`, the shape
  `contributed-to` already used. **Measure both ends before trusting a layout constant**:
  the top was uniform and only the bottom drifted, which is invisible in any single card
  and obvious across all of them.
- **Two things that move with a width must be derived from it the same way.** The stats card
  positioned its rank ring by interpolating between two constants while the values scaled 1:1
  with the width, so widening the card by 50px moved them 50 and the ring 8, and the values
  overran the ring. Both now come off `RANK_GUTTER`.

## Card text and translations

**No user-visible string is written in English at its use site.** Every word a card draws
— a label, a title, an empty state, a fallback description, and the `<desc>` an assistive
reader gets — comes from the card's own locale table, so it is one table edit away from
being translated.
This was not true until 2026-09-05: the contributed-to card was English throughout (title,
footer, "No contributions found", its whole accessibility description), the gist and repo
cards hardcoded `'No description provided'` and the `'Unspecified'` they draw for a
repository with no language, gist's accessibility line spelled out
`Language: … , Stars: … , Forks: …`, and the stats card's spelled out `Rank:`. A string
that reaches the SVG without passing through `t` is the bug this rule exists to stop.

- **A card draws its wordings through `localize`, and names each one where it draws it.**
  `const t = localize(statCardLocales, locale)`, then `t.totalStars()` and
  `t.title({ name, apostrophe })` — one function per key, taking exactly the values that
  key's wording declares. **A key therefore carries no card name in front of it**, the
  table it belongs to being named at the top of the card rather than in all 20 of its
  call sites: `statcard.totalstars` became `totalStars` on 2026-09-08.
  - **The point of it is that an editor can follow a wording to where it is written.**
    Measured over the language server on TypeScript 7.0.2, on the shape this replaced:
    go-to-definition on the string in `i18n.t('statcard.totalstars')` resolves to
    **nothing at all**, and find-all-references lists only the other call sites — a string
    literal argument is not a reference to anything, whether its type comes from
    `keyof Table` or from a hand-written union. A property access is, and it resolves
    through the mapped type across files, to the exact line of the table.
  - **A helper that draws takes `Localized<typeof xCardLocales>`, spelled out.** Two
    per-card aliases for it were named and deleted on 2026-09-08 — `XText`, then
    `XWordings` — because the type has a name already and neither invented one was
    coherent with `LocaleTable` and `Localized`. If an alias ever earns its keep, mirror
    `Localized` rather than reaching for `Locale`: that word is the language tag, in
    every card's options and every signature in this module.
  - **Keys are camelCase because oxlint requires it.** `typescript/dot-notation` demands
    dot access wherever a key can take it, so a kebab key would leave a card reading
    `t.title()` beside `t['no-contributions']()`.
  - **Two cards' tables are never merged.** The stats card drew from
    `{ ...statCardLocales, ...wakatimeCardLocales }` under one `I18n<typeof A & typeof B>`
    until this landed, which is what forced the prefixes in the first place: unprefixed,
    both tables' `title` collide, the intersection reduces `en` to `never`, and the card
    stops compiling. It now localizes each table separately — `t` and `wakatime` — so
    there is nothing to collide.
  - **The `I18n` class is gone**, and with it the only path by which a key could be
    absent at runtime: `localize` walks the table's own entries. The throw for a missing
    key went with it. The module it lived in is **`common/localize.ts`** — renamed from
    `I18n.ts` on 2026-09-08, since nothing named `I18n` is declared there any more, and
    named for the function rather than `locale.ts` so it does not sit one letter from
    `common/locales.ts` beside it.
  - **`common/locales.ts` holds the wordings more than one card draws**, and a card that
    reads it names the handle `commonT` — `t` being its own table's. `lastYear` was the
    first: the stats card imported it from the **wakatime card's** table, which is the
    cross-card import the rule below forbids. Its 47 translations moved verbatim, so
    nothing regressed.
- **A new key is written in `en` only.** Backfilling 47 locales by machine translation is
  worse than an honest fallback, so a wording falls back to its `en` string when the
  requested locale has no entry for it. That fallback landed with this rule and also
  repaired the keys added before it — `contributions`, `allTimeContribs` and the five
  repo-card show-stats among them — each of which threw
  `translation not found for locale` and so failed the whole card for every locale it had
  not reached. It still throws for a wording with no `en` — which `LocaleTable` requires,
  so only a table assembled at runtime reaches that throw.
- **A card whose text is translated takes `locale`,** in its options, in its handler's
  schema and in the CLI's option list for it. The three move together.
- **A locale table is data, declared with `defineLocales`.** It was a function of the
  values its strings interpolate until 2026-09-07 — `statCardLocales({ name, apostrophe })`
  built 45 keys × 47 locales, some 1200 strings, so a card could read 30 of them. The
  wording carries `{name}` placeholders instead and `t` substitutes them:
  `t.title({ name, apostrophe })`. `defineLocales` is a `<const Table>`
  identity function, and that is the whole point of it — it keeps each string's literal
  type, which is what lets a wording reject a call missing a value it declares.
  - **`satisfies LocaleTable` is not a replacement for it, and fails silently.** It
    contextually types each string, so the wordings widen to `string` and every
    placeholder check disappears while the table still looks checked. Verified on
    2026-09-08; `as const satisfies LocaleTable` does keep the literals, and is the only
    other form that works.
- **The word order is the translation's, and so is which values it uses.** A locale may
  name fewer placeholders than `en` — most locales of the stats card's `title` have no use for the
  possessive `{apostrophe}` — but never one `en` does not supply, which throws. Nothing
  checks a `{name}` the way the compiler checked a `${name}`, so `tests/locales.test.ts`
  walks every table for that and for a locale name outside `AVAILABLE_LOCALES`.
- **A wording that depends on a number is written as plural forms, not assembled.**
  `{ one: '{count} repository', other: '{count} repositories' }`; `t` is given a `count`
  and `Intl.PluralRules` picks the category by the rules of the locale the wording came
  from, with `other` answering for a category that locale has not written. This is what
  the card used to do with a `repoWord` ternary, in English's plural rule, for every
  locale.
- **A whole phrase is one key, not a `label: value` pair assembled in the card.** The
  accessibility rows are `'{repo}: {count} contributions, years: {years}'` and
  `'{desc}. Language: {language}, Stars: {stars}, Forks: {forks}'` — one wording each, so
  a translation can move the parts around. Composing them in the card was the best the
  repo could do before interpolation, and left the punctuation and the order in English's
  hands. A parenthesised year is still composed, and is the remaining exception —
  the wakatime card's `title` plus `(last 7 days)`, and the stats card's `commits` plus
  the `lastYear` wording in parentheses. **Do not "fix" either by making the phrase one
  key.** Both halves carry 47 locales each, so composing them draws a fully translated
  label; a new whole-phrase key would be `en` only by the rule above, and would regress
  every one of those locales to English. Counted on 2026-09-08. It becomes worth doing
  when the parenthetical earns its own translated key, not before.
- **The error card's report line is measured, not guessed.** It sits under the message rather than
  beside the title because it no longer fits: at the title's own `600 16px` the inherited URL
  reached 561px inside a 576.5px card and `https://tinyurl.com/stats-forge-bug` reaches 587px.
  Re-measure in a canvas before moving it back. It carries `data-testid="report"`, and is omitted
  for an upstream failure or when `show_repo_link` is off — which had no test until 2026-09-07.
- **Error card text is the known exception.** `CardError` and `REJECTION_MESSAGES` are
  English, and deliberately outside the locale tables: an error is thrown before — and often
  because — the locale was parsed. Don't quietly translate one; that is its own decision.
