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

`wakatime_host` points at a self-hosted WakaTime — Wakapi or Hakatime — and defaults to
`wakatime.com`. It is a host and an optional port, `wakapi.dev` or `localhost:3000`:
a path, a query or credentials are refused, as is a username that is not one path segment.

The config's `wakatimeHosts` decides which hosts it will fetch from: `wakatime.com` alone unless
you list others, or `'any'` for a host that only ever fetches for the person running it, as the
CLI does. Any other host fails as `wakatime_invalid_host` before a request is made.

The profile has to be public: WakaTime hides these numbers until "Display coding activity
publicly" is switched on.
