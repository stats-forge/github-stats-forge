---
title: fetchWakatimeStats
description: Coding time per language, from a public WakaTime profile.
---

The fetcher behind the [WakaTime card](../../cards/wakatime/), and the only one here that never
touches GitHub.

<!-- api: fetchWakatimeStats -->

## No token, but still a config

It needs no GitHub token, and it still takes a `CardConfig`, because that is what carries the
`fetch` every request goes through. A host that proxies, caches or mocks its traffic gets the same
treatment here as everywhere else.

## Another instance

`api_domain` points at a self-hosted WakaTime — Wakapi or Hakatime — and defaults to
`wakatime.com`. A trailing slash is trimmed for you.

The profile has to be public: WakaTime hides these numbers until "Display coding activity
publicly" is switched on.
