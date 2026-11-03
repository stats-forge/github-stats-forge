---
title: Light and dark mode
description: Four ways to make one card read well in both GitHub themes, and which to reach for.
---

A card that suits a light README looks wrong in a dark one. The default theme already follows the
viewer, but there are four ways to handle it. They are not equivalent — the first is the one to
reach for, and the rest exist for the cases it does not cover.

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

`theme` takes two names, `light,dark`, and the card wears the first in light mode and the second in
dark. It carries a stylesheet that follows the viewer's setting, so there is one file and one URL:

```md
![My GitHub stats](./cards/stats.svg)
```

rendered with:

```json
{
  "version": 1,
  "card": "stats",
  "username": "octocat",
  "theme": "brass_light,magma_dark"
}
```

With no theme at all, a card already does this, as `ember_light,ember_dark`.

It is not GitHub-specific: one file works anywhere an image goes, including where `<picture>` is
stripped.

:::note
The switch follows the **browser or OS** colour scheme, not the theme you picked in GitHub's
settings. GitHub serves images through
[an anonymising proxy](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls),
so the card never learns which GitHub theme is showing it. The two usually agree; where they are
set differently, they will not.
:::

### Which theme each mode wears

```text
theme=brass_light,magma_dark
      │           └── dark mode
      └────────────── light mode
```

| `theme`                    | Light mode     | Dark mode     |
| -------------------------- | -------------- | ------------- |
| nothing                    | `ember_light`  | `ember_dark`  |
| `cobalt_dark`              | `cobalt_dark`  | `cobalt_dark` |
| `github_light,github_dark` | `github_light` | `github_dark` |

One name means the card never changes. A pair naming one theme twice is the same as naming it once.

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

## Which to use

| Situation                                     | Reach for                              |
| --------------------------------------------- | -------------------------------------- |
| A README, and you can commit two files        | `<picture>`                            |
| One file that has to work anywhere            | a `light,dark` pair, as the default is |
| It must follow the GitHub setting, not the OS | `#gh-dark-mode-only`                   |
| You want no background at all                 | `transparent`                          |
