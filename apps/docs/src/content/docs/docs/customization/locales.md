---
title: Locales
description: The 47 locales a card's own text can be drawn in, and what happens to an untranslated string.
---

Every word a card draws itself — a title, a label, an empty state, and the description an assistive
reader gets — comes from a translation table. `locale` picks which one:

```text
?username=octocat&locale=es
```

An unknown code is an error reading `Locale not found`, not a silent fallback to English:
a card drawn in the wrong language is worse than a card that says why it could not be.

## Available locales

`en`, `ar`, `az`, `bg`, `bn`, `ca`, `cn`, `zh-tw`, `cs`, `de`, `sw`, `ur`, `es`, `fa`, `fi`, `fr`,
`hi`, `sa`, `hu`, `it`, `ja`, `kr`, `nl`, `pt-pt`, `pt-br`, `np`, `el`, `ro`, `ru`, `uk-ua`, `id`,
`ml`, `my`, `ta`, `sk`, `tr`, `pl`, `uz`, `vi`, `se`, `he`, `fil`, `th`, `sr`, `sr-latn`, `no`,
`be`.

## What is not translated yet

A string added to a card is written in English first and translated afterwards, so a locale can be
missing a key that `en` has. When that happens the card draws the English string for that one line
and renders normally — it does not fail, and it does not fall back to English for the whole card.

Two things are deliberately never translated:

- **Error cards.** An error is often thrown before the locale has been read, and sometimes
  _because_ it could not be. They are English.
- **Your own text.** `custom_title` is drawn exactly as you passed it.

## Contributing a translation

The tables live in `packages/core/src/translations.ts`, one entry per key per locale.
Adding a language means adding your code to each key you can translate;
anything you leave out keeps reading in English until someone fills it in.
