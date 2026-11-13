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
  },
});

export { orgCardLocales };
