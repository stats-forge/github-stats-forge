import { defineLocales } from '@stats-forge/card-kit';

/** The gist card's labels in the locales they have been translated into. */
const gistCardLocales = defineLocales({
  en: {
    noDescription: 'No description provided',
    unspecifiedLanguage: 'Unspecified',
    // What an assistive reader gets in place of the card, whose inner text `role="img"` hides.
    accessibilityDesc: '{desc}. Language: {language}, Stars: {stars}, Forks: {forks}',
  },
});

export { gistCardLocales };
