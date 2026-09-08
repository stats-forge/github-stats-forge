import { defineLocales } from '../../common/localize.ts';

/** The gist card's labels in the locales they have been translated into. */
const gistCardLocales = defineLocales({
  noDescription: {
    en: 'No description provided',
  },
  unspecifiedLanguage: {
    en: 'Unspecified',
  },
  // What an assistive reader gets in place of the card, whose inner text `role="img"` hides.
  accessibilityDesc: {
    en: '{desc}. Language: {language}, Stars: {stars}, Forks: {forks}',
  },
});

export { gistCardLocales };
