---
'@stats-forge/github-stats-server': minor
---

feat(server): serve the documentation, and an anvil that draws from the instance

The image now carries the documentation site, built from the same commit,
so an instance documents the version that is running rather than pointing at a copy.
It is served from `SITE_DIR`, claimed after the cards so nothing can shadow one.

The anvil at `/anvil/` draws from the instance itself:
real cards, from its tokens and its allowlists,
with the card's URL beside the saved file — the one thing a static build cannot know.
A picker falls back to the recording, which is what an instance with no `PAT_1` still has.
The page says which of the two is drawing, because only one of them keeps what you type
in the browser.

The site marks itself as self-hosted: an amber icon, a chip beside the title,
a suffix on the tab and a banner on the landing page.
