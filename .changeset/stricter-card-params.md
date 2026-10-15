---
'@stats-forge/github-stats-forge-core': minor
'@stats-forge/github-stats-server': minor
---

feat!: stricter, more consistent card params

- A malformed or unknown value is an `invalid_param` instead of being ignored: booleans,
  `number_format`, theme names, whole numbers, and `show`, `hide` and `role` entries.
- `show` and `hide` each take any stat the card draws; a stat in both is left out, and not
  fetched.
- Fixed values match case-insensitively, and lists trim spaces and drop empty entries.
- An empty boolean (`?hide_border`) is `true`; any other empty param is absent.
- A param given twice is joined into one list, by the server and the anvil as by the CLI, through
  the new `queryOf` export.
- A number is digits only, with an optional `px` on `card_width` and `border_radius`; widths,
  heights and counts must be at least 1.
- WakaTime `api_domain` is a host and an optional port (1–65535); its `username` is one path segment.
- `exclude_repo` takes `owner/name` or `name`, ignoring case, on every card.
- Each api handler carries `PARAMS`, the kind and choices of every param it reads, and `COLOR_PARAM_KEYS`
  names the color params.
- Renamed: `contribs_include_own_repos` → `include_own_repos`; `stats_format` and `display_format`
  → `value_format`, whose `percentages` is now `percent`.
- Renamed stats: `contribs` → `contributed_to`, `all_time_contribs` → `contributed_to_all_time`,
  `prs_authored` → `prs_opened`, `issues_authored` → `issues_opened`, and org-activity's
  `discussions` → `discussions_started`.
- Renamed: the top-languages and WakaTime cards' `hide` → `hide_langs`, so `hide` always names stats.
- Renamed: `custom_title` → `title`, `role` → `affiliation`, `api_domain` → `wakatime_host`,
  `browser_rendering` → `wrap_description`.
- `number_precision` reaches every card drawing stat rows, and the repo card's stars and forks follow
  `number_format`.
- The org-activity card takes `from` and `to` like the other cards; `days` stays as the shorthand
  for the last N days, and naming both is an `invalid_param`.
- Removed `wrap_description` (formerly `browser_rendering`): a description is always wrapped by the
  card, to `description_lines_count` lines.
- Removed `line_height`: rows sit on each card's own spacing.
- Removed `text_bold`: each card keeps its own value weight.
