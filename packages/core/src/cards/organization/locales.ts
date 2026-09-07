import { defineLocales } from '../../common/I18n.ts';

/** The organization card's labels in the locales they have been translated into. */
const orgCardLocales = defineLocales({
  'orgcard.title': {
    en: `{name}'{apostrophe} GitHub Organization`,
  },
  'orgcard.no-description': {
    en: 'No description provided',
  },
  'orgcard.repos': {
    en: 'Public repositories',
  },
  'orgcard.stars': {
    en: 'Total stars',
  },
  'orgcard.forks': {
    en: 'Total forks',
  },
  'orgcard.watchers': {
    en: 'Total watchers',
  },
  'orgcard.open-issues': {
    en: 'Open issues',
  },
  'orgcard.open-prs': {
    en: 'Open PRs',
  },
  'orgcard.releases': {
    en: 'Releases',
  },
  'orgcard.commits': {
    en: 'Commits',
  },
  'orgcard.members': {
    en: 'Public members',
  },
  'orgcard.top-language': {
    en: 'Top language',
  },
  'orgcard.created': {
    en: 'Created',
  },
  'orgcard.unspecified-language': {
    en: 'Unspecified',
  },
});

export { orgCardLocales };
