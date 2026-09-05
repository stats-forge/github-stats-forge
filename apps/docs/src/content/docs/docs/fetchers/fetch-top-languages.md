---
title: fetchTopLanguages
description: The languages of the repositories a user owns or contributes to, ranked.
---

The fetcher behind the [top languages card](../../cards/top-languages/).

<!-- api: fetchTopLanguages -->

## Weighting

`size_weight` and `count_weight` decide what "most" means, and they are multiplied:
`size_weight=1&count_weight=0` ranks by bytes of code, `0` and `1` ranks by how many repositories
use the language, and `1` and `1` by both. The default is bytes.

## What comes back

A `TopLangData` — every language keyed by name, each with its `size`, its `count` and the colour
GitHub gives it. Nothing is truncated: `langs_count` is the card's business, not the fetcher's.
