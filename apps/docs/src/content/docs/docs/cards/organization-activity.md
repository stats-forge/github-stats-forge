---
title: Organization activity
description: What an organization did over a window.
---

What moved in an organization lately: pull requests opened and merged, issues opened and closed,
and — for the asking — discussions opened and commits authored.
The window is an option and the title says what it is, so the card reads as a rolling report
rather than a total that only ever grows.

:::caution
Without a token that can read **issues**, the card draws the pull request count instead.
See [the token it needs](#the-token-it-needs).
:::

![The organization activity card](/cards/org-activity.svg)

```text
?org=vitest-dev&days=30&show=commits
```

## Required

| Option | What it is                                                |
| ------ | --------------------------------------------------------- |
| `org`  | The organization's login — the name in `github.com/<org>` |

## Options

| Option               | Values                                                    | What it does                                  |
| -------------------- | --------------------------------------------------------- | --------------------------------------------- |
| `days`               | `1` to `365`                                              | Days the window covers (30 by default)        |
| `show`               | `discussions` `commits`                                   | Draw these stats as well                      |
| `hide`               | `prs_opened` `prs_merged` `issues_opened` `issues_closed` | Leave these stats out                         |
| `show_icons`         | `true` `false`                                            | Show an icon beside each stat (on by default) |
| `custom_title`       | any text                                                  | Replace the card's title                      |
| `hide_title`         | `true` `false`                                            | Drop the title, its icon and its band         |
| `card_width`         | a number                                                  | Card width in pixels                          |
| `line_height`        | a number                                                  | Space between the stat rows                   |
| `text_bold`          | `true` `false`                                            | Bold the values (on by default)               |
| `number_format`      | `short` `long`                                            | `1.2k` or `1204`                              |
| `disable_animations` | `true` `false`                                            | Draw it without the fade-in                   |

Plus the [common options](../../customization/common-options/) every card takes,
and `locale`.

## The window

`days` counts back from today, both ends inclusive — so the default 30 is today and the 29 days
before it, and `days=1` is today alone. It rolls: the card drawn tomorrow covers tomorrow.

Every end is a UTC date, which is all GitHub's search qualifiers read. A card rendered just after
midnight UTC therefore counts a today that has barely started.

## What each stat counts

Each one is a search over the window, and each asks a different question of it —
so they do not add up, and none of them is a subset of another:

- **PRs opened** were _created_ in the window, whether or not they are still open.
- **PRs merged** were _merged_ in the window, whenever they were opened.
- **Issues opened** were created in the window; **issues closed** were closed in it.
- **Discussions opened** counts discussions created across the organization's repositories.
- **Commits** are commits _authored_ in the window, by author date rather than push date.

A pull request opened in March and merged in April is counted by neither figure of a window
covering only May, and by both figures of one covering both months.

## The token it needs

Organization data is granted separately from personal data, so a token that draws your stats
card need not draw this one.

| Token                   | What it needs                                                       |
| ----------------------- | ------------------------------------------------------------------- |
| Classic PAT             | the `repo` scope                                                    |
| Fine-grained PAT        | the **organization** as its resource owner, with `Issues: Read`     |
| GitHub App installation | the app installed on the organization, with the `Issues` permission |
| Actions `GITHUB_TOKEN`  | `issues: read` in the workflow's `permissions:` block               |

A token refused issues is not told so: GitHub answers the searches with pull requests, so both
issue rows would carry the pull request count. The card checks what the search matched and draws
an error instead.

Hide both rows to draw the rest of the card from such a token:

```text
?org=ORG_NAME&hide=issues_opened,issues_closed
```

## Commits cost an extra request

GitHub's GraphQL search cannot search commits, so `show=commits` adds a REST commit search:
a second request, against a much smaller allowance than the rest of the card uses.
Everything else rides on one GraphQL request and one rate-limit point, whatever `show` and `hide`
leave on the card.

Where that search is refused, the commits row is left out and the rest of the card still renders.

## What the numbers can see

A search answers what its token is allowed to find. A self-hosted instance whose token can read
the organization's private repositories counts those as well; one without sees only the public
ones. Two honest deployments can therefore draw different numbers for the same organization.
