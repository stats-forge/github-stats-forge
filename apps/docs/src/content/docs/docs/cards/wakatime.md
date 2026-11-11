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

It leads with the range's total and its daily average, then splits that time by language.

## Options

| Option          | Values                                                              | What it does                                    |
| --------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| `layout`        | `normal` `compact`                                                  | The shape of the card                           |
| `value_format`  | `time` `percent`                                                    | Whether a language reads as hours or as a share |
| `range`         | `last_7_days` `last_30_days` `last_6_months` `last_year` `all_time` | The window counted, named in the title          |
| `langs_count`   | a number                                                            | How many languages to show                      |
| `hide_langs`    | language names                                                      | Languages to leave out                          |
| `hide_progress` | `true` `false`                                                      | Drop the bars and keep the names                |
| `wakatime_host` | a hostname                                                          | A self-hosted WakaTime, e.g. Wakapi or Hakatime |

Plus the [common options](../../customization/common-options/).

## The range

Without `range` the card counts the window the profile itself defaults to. WakaTime shares only
the ranges a profile makes public, so a range it keeps private draws the "not public" card.
