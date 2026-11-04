import { defineLocales } from '../../common/localize.ts';

/** The organization activity card's labels in the locales they have been translated into. */
const orgActivityCardLocales = defineLocales({
  title: {
    en: `{name}'{apostrophe} organization activity`,
  },
  // Drawn instead of the title above when naming the organization overruns the card.
  titleUnnamed: {
    en: 'Organization activity',
  },
  // Composed into the title in parentheses, the way the wakatime card composes its own window.
  lastDays: {
    en: { one: 'last {count} day', other: 'last {count} days' },
  },
  prsOpened: {
    en: 'PRs opened',
  },
  prsMerged: {
    en: 'PRs merged',
  },
  issuesOpened: {
    en: 'Issues opened',
  },
  issuesClosed: {
    en: 'Issues closed',
  },
  // A flow row's label, over the bar comparing what was merged with what was opened.
  pullRequests: {
    en: 'Pull requests',
  },
  prsFlow: {
    en: '{opened} opened · {merged} merged',
  },
  issues: {
    en: 'Issues',
  },
  issuesFlow: {
    en: '{opened} opened · {closed} closed',
  },
  discussions: {
    en: 'Discussions opened',
  },
  commits: {
    en: 'Commits',
  },
});

export { orgActivityCardLocales };
