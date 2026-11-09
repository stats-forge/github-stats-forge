import { defineLocales } from '../../common/localize.ts';

/** The organization calendar card's labels in the locales they have been translated into. */
const orgCalendarCardLocales = defineLocales({
  en: {
    title: "{name}'{apostrophe} activity, week by week",
    // Drawn instead of the title above when naming the organization overruns the card.
    titleUnnamed: 'Activity, week by week',
    // Beside the total, which is drawn as a number of its own.
    prsMerged: { one: 'pull request merged', other: 'pull requests merged' },
    prsOpened: { one: 'pull request opened', other: 'pull requests opened' },
    issuesOpened: { one: 'issue opened', other: 'issues opened' },
    issuesClosed: { one: 'issue closed', other: 'issues closed' },
    // What the total counts, then the weekly average, beside the total.
    summary: '{counted} · {average} a week',
    less: 'Less',
    more: 'More',
    // A week's count shortened to fit its cell: the largest power of ten below it, `{shown}` abbreviated.
    atLeast: '{shown}+',
    // Read out for a card with no weeks to show.
    descriptionNoWeeks: '{total} {counted}.',
    description: '{total} {counted}, {average} a week, from {from} to {to}. Week by week: {weeks}.',
  },
});

export { orgCalendarCardLocales };
