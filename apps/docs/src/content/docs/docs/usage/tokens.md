---
title: GitHub tokens
description: Which token each card needs, where it goes, and how several share the rate limit.
---

Every card but [WakaTime](../../cards/wakatime/) reads the GitHub API, which needs a personal
access token. The cards only read, so a
[classic token](https://github.com/settings/tokens/new) with no scopes draws every card about a
user, a repository or a gist.

A workflow's own `GITHUB_TOKEN` is scoped to its repository, so it cannot draw the user or gist
cards; the organization cards are in the table below.

## The organization cards

Organization data is granted separately from personal data, so a token that draws your stats card
need not draw these.

| Token                   | [Organization](../../cards/organization/)                                                     | [Organization activity](../../cards/organization-activity/) |
| ----------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Classic PAT             | no scopes; `read:org` for `show=members`                                                      | the `repo` scope                                            |
| Fine-grained PAT        | the **organization** as resource owner, which it approves; `Members: Read` for `show=members` | the same, with `Issues: Read`                               |
| GitHub App installation | the app installed on the organization; the `Members` permission for `show=members`            | the same, with the `Issues` permission                      |
| Actions `GITHUB_TOKEN`  | cannot read the member count                                                                  | `issues: read` in the workflow's `permissions:`             |

A stat the token cannot read draws an error naming the permission and the option that drops it,
rather than a card missing the row: drop `members` from the organization card's `show`, or
`hide=issues_opened,issues_closed` on the activity card.

## Several tokens

`PAT_1`, `PAT_2`, … are used in rotation: when one is rate limited or rejected, the card moves to the
next, so a second token doubles what you can draw. It matters most for the stats card, whose extra
stats each cost a request. When GitHub rejects every one, the card reads `Every GitHub API token was rejected`.

## Where it goes

A token never belongs spelled out in a command you type: it lands in your shell history.

| Drawing with          | Where the token goes                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| The action            | a repository secret, as [its README](https://github.com/stats-forge/github-stats-forge-action) shows |
| The CLI in a workflow | a repository secret, as in [Keeping it current](../in-your-readme/#keeping-it-current)               |
| The CLI               | the environment, a `.env` file or the prompt: see [A token](../cli/#a-token)                         |
| Your own server       | an env file or a secret manager: see [Where the token lives](../self-hosting/#where-the-token-lives) |
| The library           | `CardConfig`'s `pats`: see [Configuring a deployment](../library/#configuring-a-deployment)          |

A token is never logged; the name of the variable it came from is, so a failing one can be found.
