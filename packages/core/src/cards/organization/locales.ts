import { defineLocales } from '@stats-forge/card-kit';

/** The organization card's labels in the locales they have been translated into. */
const orgCardLocales = defineLocales({
  en: {
    title: "{name}'{apostrophe} GitHub Organization",
    noDescription: 'No description provided',
    repos: 'Public repositories',
    stars: 'Total stars',
    forks: 'Total forks',
    watchers: 'Total watchers',
    openIssues: 'Open issues',
    openPrs: 'Open PRs',
    releases: 'Releases',
    commits: 'Commits',
    members: 'Public members',
    topLanguage: 'Top language',
    created: 'Created',
    unspecifiedLanguage: 'Unspecified',
    // The title an assistive reader gets in place of the card's own, whose inner text
    // `role="img"` hides.
    accessibilityTitle: '{title}, Rank: {level}',
  },
});

export { orgCardLocales };
