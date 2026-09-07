import { defineLocales } from '../../common/I18n.ts';

/** The gist card's labels in the locales they have been translated into. */
const gistCardLocales = defineLocales({
  'gistcard.no-description': {
    en: 'No description provided',
  },
  'gistcard.unspecified-language': {
    en: 'Unspecified',
  },
  // What an assistive reader gets in place of the card, whose inner text `role="img"` hides.
  'gistcard.accessibility-desc': {
    en: '{desc}. Language: {language}, Stars: {stars}, Forks: {forks}',
  },
});

export { gistCardLocales };
