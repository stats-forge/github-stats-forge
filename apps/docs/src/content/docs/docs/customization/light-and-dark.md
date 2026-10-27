---
title: Light and dark mode
description: Five ways to make one card read well in both GitHub themes, and which to reach for.
---

A card is drawn with fixed colours, so a card that suits a light README looks wrong in a dark one.
There are five ways around that. They are not equivalent — the first is the one to reach for, and
the rest exist for the cases it does not cover.

## GitHub's media feature

[GitHub picks between images in a `<picture>` element](https://github.blog/changelog/2022-05-19-specify-theme-context-for-images-in-markdown-beta/)
using `prefers-color-scheme`. Render the card twice, once per theme, and let the browser
choose:

```html
<picture>
  <source srcset="./cards/stats-dark.svg" media="(prefers-color-scheme: dark)" />
  <!-- light mode -->
  <img src="./cards/stats-light.svg" alt="My GitHub stats" />
</picture>
```

**This is the recommendation.** Each file is a plain card, the choice happens before anything is
fetched, and it is the approach GitHub documents. Only the `<img>` takes the `alt`: it is what a
screen reader announces. Every card on this site is drawn this way.

## Both modes in one card

`theme_light` and `theme_dark`, and the `*_light` / `*_dark` colour params, put both palettes in a
single card. The card carries a stylesheet that follows the viewer's setting, so there is one file
and one URL:

```md
![My GitHub stats](./cards/stats.svg)
```

rendered from options that name both:

```json
{
  "version": 1,
  "card": "stats",
  "username": "octocat",
  "theme_light": "light_github",
  "theme_dark": "dark_github"
}
```

It is not GitHub-specific: one file works anywhere an image goes, including where `<picture>` is
stripped.

:::note
The switch follows the **browser or OS** colour scheme, not the theme you picked in GitHub's
settings. GitHub serves images through
[an anonymising proxy](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls),
so the card never learns which GitHub theme is showing it. The two usually agree; where they are
set differently, they will not.
:::

### What wins over what

Two stages. The first decides how many palettes the card carries; the second fills each one in.

<div class="precedence">

<div class="precedence__stage">
<p class="precedence__title">1 · How many palettes the card carries</p>

- **No `*_light` / `*_dark` among the params** — one palette. The card has no dark-mode block at
  all.
- **At least one of them** — two palettes, each resolved on its own:
  - light ← the params, with `*_light` on top
  - dark ← the params, with `*_dark` on top

</div>

<div class="precedence__stage">
<p class="precedence__title">2 · How each colour in a palette is filled in</p>

Each colour takes the first of:

1. the colour param you passed — `title_color`, `bg_color`, …
2. the named theme's colour — `theme_light` / `theme_dark`, else `theme`
3. the default theme's colour

<div class="precedence__note">

`border_color` ends differently. When neither you nor the theme names one, it is derived from the
background: a light background gets a dark hairline, a dark one a light hairline, and anything
under 50% opacity a neutral one, since the page behind decides.

</div>

</div>

</div>

So the two mix: a light and a dark theme, with one colour pinned across both.

```json
{
  "theme_light": "light_github",
  "theme_dark": "dark_github",
  "title_color": "aabbcc"
}
```

`bg_color_dark` on its own changes one colour in dark mode and leaves the rest as the base theme
drew it.

## GitHub's theme context tag

Appending
[`#gh-dark-mode-only` or `#gh-light-mode-only`](https://github.blog/changelog/2021-11-24-specify-theme-context-for-images-in-markdown/)
to an image shows it only on that GitHub mode:

```md
![My GitHub stats](./cards/stats-dark.svg#gh-dark-mode-only)
![My GitHub stats](./cards/stats-light.svg#gh-light-mode-only)
```

This follows the **GitHub** setting rather than the browser's, but both images are fetched and a
screen reader meets the card twice: prefer `<picture>` unless you need the GitHub setting.

## The transparent theme

`transparent` has no background at all, so one card sits on either mode:

```md
![My GitHub stats](./cards/stats.svg)
```

rendered with `"theme": "transparent"`.

![The stats card in the transparent theme](/themes/transparent.svg)

One file and nothing GitHub-specific, but its text colours must read on both backgrounds, so it
looks washed out against a strong one.

## An alpha channel on any theme

A `bg_color` with eight hex digits carries alpha, and `00000000` is fully see-through. That turns
**any** of the [themes](../themes/) transparent while keeping its text and icon colours:

```md
![My GitHub stats](./cards/stats.svg)
```

rendered with `"theme": "tokyonight", "bg_color": "00000000"`.

Reach for it when `transparent`'s own colours are not the ones you want; the border turns neutral,
as described above.

## Which to use

| Situation                                     | Reach for                             |
| --------------------------------------------- | ------------------------------------- |
| A README, and you can commit two files        | `<picture>`                           |
| One file that has to work anywhere            | `theme_light` / `theme_dark`          |
| It must follow the GitHub setting, not the OS | `#gh-dark-mode-only`                  |
| You want no background at all                 | `transparent`, or `bg_color=00000000` |
