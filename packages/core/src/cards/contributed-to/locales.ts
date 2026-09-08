import { defineLocales } from '../../common/localize.ts';

/** The contributed-to card's labels in the locales they have been translated into. */
const contributedToCardLocales = defineLocales({
  title: {
    en: 'Repositories {login} contributed to',
  },
  // Drawn instead of the title above when naming the account overruns the card.
  titleUnnamed: {
    en: 'Repositories contributed to',
  },
  noContributions: {
    en: 'No contributions found',
  },
  footerAll: {
    en: { one: '{count} repository', other: '{count} repositories' },
  },
  footerTop: {
    en: {
      one: 'top {shown} of {count} repository',
      other: 'top {shown} of {count} repositories',
    },
  },
  // One row of what an assistive reader gets in place of the card, whose inner text
  // `role="img"` hides. The year marks carry information no other element does, so the
  // row naming them is a wording of its own rather than a fragment appended to the other.
  accessibilityRepo: {
    en: {
      one: '{repo}: {count} contribution',
      other: '{repo}: {count} contributions',
    },
  },
  accessibilityRepoYears: {
    en: {
      one: '{repo}: {count} contribution, years: {years}',
      other: '{repo}: {count} contributions, years: {years}',
    },
  },
});

export { contributedToCardLocales };
