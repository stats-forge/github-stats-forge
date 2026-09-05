---
title: fetchGist
description: 'One gist: its first file, description, language, stars and forks.'
---

The fetcher behind the [gist pin card](../../cards/gist-pin/).

<!-- api: fetchGist -->

## The id

The id is the hash at the end of the gist's URL. A gist that does not exist, or that the token
cannot see, is a `not_found` — not an empty result.
