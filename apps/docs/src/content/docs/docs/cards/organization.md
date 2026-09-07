---
title: Organization card
description: An organization, and the totals of its public repositories.
---

An organization's own description, and what its public repositories add up to:
how many there are, the stars, forks and watchers they hold between them,
and how much is open across them.
Releases, commits, public members, the most common language and the founding year are there for
the asking.

![The organization card](/cards/organization.svg)

```text
?org=vitest-dev&show=releases,commits,top_language
```

## Required

| Option | What it is                                                |
| ------ | --------------------------------------------------------- |
| `org`  | The organization's login — the name in `github.com/<org>` |

## Options

| Option             | Values                                                      | What it does                                  |
| ------------------ | ----------------------------------------------------------- | --------------------------------------------- |
| `show`             | `releases` `commits` `members` `top_language` `created`     | Draw these stats as well                      |
| `hide`             | `repos` `stars` `forks` `watchers` `open_issues` `open_prs` | Leave these stats out                         |
| `show_icons`       | `true` `false`                                              | Show an icon beside each stat (on by default) |
| `hide_description` | `true` `false`                                              | Leave the organization's description out      |
| `custom_title`     | any text                                                    | Replace the card's title                      |
| `hide_title`       | `true` `false`                                              | Drop the title, its icon and its band         |
| `card_width`       | a number                                                    | Card width in pixels                          |
| `line_height`      | a number                                                    | Space between the stat rows                   |
| `text_bold`        | `true` `false`                                              | Bold the values (on by default)               |
| `number_format`    | `short` `long`                                              | `18.7k` or `18724`                            |

Plus the [common options](../../customization/common-options/) every card takes,
and `locale`.

## What the totals count

Every total but the repository count is summed over the organization's **public, non-fork
repositories**, and the repository count is those same repositories —
a private repository is invisible to the card whether or not the token can see it.

Only the first 500 of them are read, most-starred first.
An organization with more gets its summed totals written as `18.7k+`:
a lower bound, since the repositories past the 500th are the least-starred ones.
The repository count is GitHub's own, so it is never short.

Three of them are worth spelling out:

- **Commits** counts the default branch of each repository — every author, merges included, and
  whatever history a repository was imported with. It is a measure of how much code has moved
  through the organization, not of who wrote it.
- **Open issues** and **open PRs** are what is open right now, so they move on their own.
- **Members** counts the people whose membership the organization shows publicly.
  Membership is private by default, so it is usually fewer people than the organization has —
  and `0` for an organization whose members are all private.
