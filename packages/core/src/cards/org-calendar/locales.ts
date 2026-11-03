import { defineLocales } from '../../common/localize.ts';

/** The organization calendar card's labels in the locales they have been translated into. */
const orgCalendarCardLocales = defineLocales({
  title: {
    en: `{name}'{apostrophe} activity, week by week`,
  },
  // Drawn instead of the title above when naming the organization overruns the card.
  titleUnnamed: {
    en: 'Activity, week by week',
  },
  // Beside the total, which is drawn as a number of its own.
  prsMerged: {
    en: { one: 'pull request merged', other: 'pull requests merged' },
  },
  prsOpened: {
    en: { one: 'pull request opened', other: 'pull requests opened' },
  },
  issuesOpened: {
    en: { one: 'issue opened', other: 'issues opened' },
  },
  issuesClosed: {
    en: { one: 'issue closed', other: 'issues closed' },
  },
  // What the total counts, then the weekly average, beside the total.
  summary: {
    en: '{counted} · {average} a week',
  },
  less: {
    en: 'Less',
  },
  more: {
    en: 'More',
  },
  // A week's count shortened to fit its cell: the largest power of ten below it, `{shown}` abbreviated.
  atLeast: {
    en: '{shown}+',
  },
  // Read out for a card with no weeks to show.
  descriptionNoWeeks: {
    en: '{total} {counted}.',
  },
  description: {
    en: '{total} {counted}, {average} a week, from {from} to {to}. Week by week: {weeks}.',
  },
});

export { orgCalendarCardLocales };
