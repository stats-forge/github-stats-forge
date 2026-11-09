import { defineLocales } from '../../common/localize.ts';

/** The organization activity card's labels in the locales they have been translated into. */
const orgActivityCardLocales = defineLocales({
  en: {
    title: "{name}'{apostrophe} organization activity",
    // Drawn instead of the title above when naming the organization overruns the card.
    titleUnnamed: 'Organization activity',
    // Composed into the title in parentheses, the way the wakatime card composes its own window.
    lastDays: { one: 'last {count} day', other: 'last {count} days' },
    prsOpened: 'PRs opened',
    prsMerged: 'PRs merged',
    issuesOpened: 'Issues opened',
    issuesClosed: 'Issues closed',
    // A flow row's label, over the bar comparing what was merged with what was opened.
    pullRequests: 'Pull requests',
    prsFlow: '{opened} opened · {merged} merged',
    issues: 'Issues',
    issuesFlow: '{opened} opened · {closed} closed',
    discussions: 'Discussions opened',
    commits: 'Commits',
  },
});

export { orgActivityCardLocales };
