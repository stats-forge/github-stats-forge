---
title: WakaTime
description: Coding time per language, read from a WakaTime profile.
---

The one card that has nothing to do with GitHub: it reads a public
[WakaTime](https://wakatime.com) profile, so it needs no GitHub token.

![The WakaTime card](/cards/wakatime.svg)

```text
?username=ember-smith&layout=compact&langs_count=6
```

## Required

| Option     | What it is            |
| ---------- | --------------------- |
| `username` | The WakaTime username |

The profile has to be public: switch on "Display coding activity publicly" in your WakaTime
settings first.

## Options

| Option          | Values             | What it does                                    |
| --------------- | ------------------ | ----------------------------------------------- |
| `layout`        | `normal` `compact` | The shape of the card                           |
| `value_format`  | `time` `percent`   | Whether a language reads as hours or as a share |
| `langs_count`   | a number           | How many languages to show                      |
| `hide_langs`    | language names     | Languages to leave out                          |
| `hide_progress` | `true` `false`     | Drop the bars and keep the names                |
| `wakatime_host` | a hostname         | A self-hosted WakaTime, e.g. Wakapi or Hakatime |

Plus the [common options](../../customization/common-options/).
