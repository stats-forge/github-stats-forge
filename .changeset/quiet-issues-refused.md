---
'@stats-forge/github-stats-forge-core': patch
---

fix!: refuse a card asking for a stat the token may not read

GitHub answers a token refused issues with pull requests rather than an error, so the
organization activity card drew the pull request count under both issue labels. It now checks
what each search matched and fails with the new `forbidden` code, whose second line names the
permission and the option that drops the stat instead — `hide=issues_opened,issues_closed`
here, `show=members` on the organization card, which refuses the same way.
