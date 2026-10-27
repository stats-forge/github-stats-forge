---
title: Troubleshooting
description: What an error card means, and what to do when a card looks wrong on GitHub.
---

A card that fails is still an image: it draws the reason in two lines, so a README shows why
rather than a broken picture. A [self-hosted server](../self-hosting/#a-failure-is-still-an-image)
also names the reason in a header, and [the library](../library/#error-codes) as a code.

## Error cards

| The card reads                                                                                                          | What to do                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Missing params "username"`…                                                                                            | Add the option; each card's page lists the ones it requires                                                                                 |
| `Something went wrong`, then what is wrong — `Incorrect theme input`, `Invalid color input`…                            | Fix the option the second line names; its accepted values are on the card's page                                                            |
| `Could not resolve to a User with the login of '…'`, `Repository not found`, `Gist not found`, `Organization not found` | Check the spelling, and that it is the kind of account the card takes: each card's page names it                                            |
| `Could not render … card.`, then `At least one stat is required.` or `Either stats or rank are required.`               | `hide` left nothing to draw: keep at least one stat                                                                                         |
| `Missing token permission`                                                                                              | Give the token the permission the second line names, or drop the stat: see [GitHub tokens](../tokens/#the-organization-cards)               |
| `No GitHub API tokens found`, `Every GitHub API token was rejected`                                                     | Set `PAT_1`, or replace an expired or revoked token                                                                                         |
| `Downtime due to GitHub API rate limiting`                                                                              | Wait, redraw less often, or add [a second token](../tokens/#several-tokens)                                                                 |
| `Not allowed`                                                                                                           | The server's `ALLOWLIST` or `GIST_ALLOWLIST` leaves that account out: see [Pinning it to yourself](../self-hosting/#pinning-it-to-yourself) |
| `Could not reach GitHub`, or `Please try again later` under any line                                                    | GitHub or WakaTime failed to answer; the next redraw usually works                                                                          |

## When a card looks wrong on GitHub

- **The old card is still showing.** GitHub serves images through a proxy that caches them, and a
  hard refresh does not clear it: wait, or rename the file.
- **The animation does not play.** Some contexts strip it. Render with `disable_animations=true`
  so the card is drawn in its final state rather than its first frame.
- **The text is cut off.** Raise `card_width` where the card takes it, or shorten what goes in it: a `title`, fewer `show`
  entries.
- **Two cards sit on separate lines.** They are wider than the window: see
  [Aligning cards](../../customization/aligning-cards/#when-it-still-wraps).
- **A card suits only one GitHub theme.** See [Light and dark mode](../../customization/light-and-dark/).
