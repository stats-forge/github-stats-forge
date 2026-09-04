---
'@stats-forge/github-stats-forge-core': minor
---

refactor(core)!: build cards from a node model instead of template literals

A card is assembled as a tree, then serialized once at the end:
`el(tag, attributes, ...children)` for elements, `rule` and `atRule` for the stylesheet.
Nothing in the package concatenates markup any more.

An attribute or child that resolves to `undefined` is simply not written.
That removes what the template literals used to leave behind: blank lines, stray indentation,
and gaps where an attribute was omitted. Cards come out one element per line,
two spaces per nesting level.

Three things a consumer may notice. A `<g>` carrying only `transform="translate(0, 0)"` is gone,
as is the one `flexLayout` wrapped around a lone item:
reaching into the SVG by structure rather than by `data-testid` may need adjusting.
Text is escaped by the serializer,
so a literal `&#38;` in a description now renders as `&#38;` rather than `&`.
And rendering costs 1.5x to 2.6x what string concatenation did, 12-18us per card,
which sits behind a GitHub API call either way.
