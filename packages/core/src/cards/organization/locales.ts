import { defineLocales } from '../../common/localize.ts';

/** The organization card's labels in the locales they have been translated into. */
const orgCardLocales = defineLocales({
  title: {
    en: `{name}'{apostrophe} GitHub Organization`,
  },
  noDescription: {
    en: 'No description provided',
  },
  repos: {
    en: 'Public repositories',
  },
  stars: {
    en: 'Total stars',
  },
  forks: {
    en: 'Total forks',
  },
  watchers: {
    en: 'Total watchers',
  },
  openIssues: {
    en: 'Open issues',
  },
  openPrs: {
    en: 'Open PRs',
  },
  releases: {
    en: 'Releases',
  },
  commits: {
    en: 'Commits',
  },
  members: {
    en: 'Public members',
  },
  topLanguage: {
    en: 'Top language',
  },
  created: {
    en: 'Created',
  },
  unspecifiedLanguage: {
    en: 'Unspecified',
  },
});

export { orgCardLocales };
