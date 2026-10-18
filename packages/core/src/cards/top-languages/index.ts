import { CARD_ICON, CARD_STYLE, firefoxFontSize, font } from '../../common/brand.ts';
import { Card } from '../../common/Card.ts';
import { getLightDarkColors } from '../../common/color.ts';
import { localize } from '../../common/localize.ts';
import { clampValue, lowercaseTrim } from '../../common/ops.ts';
import type { Lang, TopLangData } from '../../fetchers/types.ts';
import type { Child } from '../../markup/index.ts';
import { atRule, el, rule } from '../../markup/index.ts';
import type { CardOptions, CommonCardOptions } from '../options.ts';

import {
  COMPACT_LAYOUT_BASE_HEIGHT,
  TOP_LANG_LAYOUTS,
  TOP_LANG_VALUE_FORMATS,
  calculateCompactLayoutHeight,
  calculateDonutLayoutHeight,
  calculateDonutVerticalLayoutHeight,
  calculateNormalLayoutHeight,
  calculatePieLayoutHeight,
  noLanguagesDataNode,
  renderCompactLayout,
  renderDonutLayout,
  renderDonutVerticalLayout,
  renderNormalLayout,
  renderPieLayout,
} from './layouts.ts';
import type { TopLangLayout, TopLangValueFormat } from './layouts.ts';
import { langCardLocales } from './locales.ts';

const DEFAULT_CARD_WIDTH = CARD_STYLE.width.compact;
const MIN_CARD_WIDTH = 280;
const MAXIMUM_LANGS_COUNT = 20;

const NORMAL_LAYOUT_DEFAULT_LANGS_COUNT = 5;
const COMPACT_LAYOUT_DEFAULT_LANGS_COUNT = 6;
const DONUT_LAYOUT_DEFAULT_LANGS_COUNT = 5;
/** Room for the chart that sits beside the language list. */
const DONUT_EXTRA_WIDTH = 50;
const PIE_LAYOUT_DEFAULT_LANGS_COUNT = 6;
const DONUT_VERTICAL_LAYOUT_DEFAULT_LANGS_COUNT = 6;

interface TopLangOptions extends CommonCardOptions {
  locale: string;
  hide_title: boolean;
  card_width: number;
  hide_langs: Array<string>;
  layout: TopLangLayout;
  title: string;
  langs_count: number;
  disable_animations: boolean;
  hide_progress: boolean;
  hide_values: boolean;
  prog_bar_bg_color: string;
  value_format: TopLangValueFormat;
}

/**
 * Trim top languages to lang_count while also hiding certain languages.
 *
 * @returns Trimmed top languages and total size.
 */
const trimTopLanguages = (
  topLangs: TopLangData,
  langs_count: number,
  hide?: Array<string>,
): { langs: Array<Lang>; totalLanguageSize: number } => {
  let langs = Object.values(topLangs);
  const langsToHide: Record<string, boolean> = {};
  const langsCount = clampValue(langs_count, 1, MAXIMUM_LANGS_COUNT);

  // populate langsToHide map for quick lookup while filtering out
  if (hide) {
    for (const langName of hide) {
      langsToHide[lowercaseTrim(langName)] = true;
    }
  }

  // filter out languages to be hidden
  langs = langs
    .toSorted((a, b) => b.size - a.size)
    .filter((lang) => !langsToHide[lowercaseTrim(lang.name)])
    .slice(0, langsCount);

  const totalLanguageSize = langs.reduce((acc, curr) => acc + curr.size, 0);

  return { langs, totalLanguageSize };
};

/**
 * Get default languages count for provided card layout.
 *
 * @returns Default languages count for input layout.
 */
const getDefaultLanguagesCountByLayout = ({
  layout,
  hide_progress,
}: {
  layout?: TopLangLayout | undefined;
  hide_progress?: boolean | undefined;
}): number => {
  if (layout === 'compact' || hide_progress === true) {
    return COMPACT_LAYOUT_DEFAULT_LANGS_COUNT;
  }
  if (layout === 'donut') {
    return DONUT_LAYOUT_DEFAULT_LANGS_COUNT;
  }
  if (layout === 'donut-vertical') {
    return DONUT_VERTICAL_LAYOUT_DEFAULT_LANGS_COUNT;
  }
  if (layout === 'pie') {
    return PIE_LAYOUT_DEFAULT_LANGS_COUNT;
  }
  return NORMAL_LAYOUT_DEFAULT_LANGS_COUNT;
};

/**
 * Renders card that display user's most frequently used programming languages.
 *
 * @returns Language card SVG object.
 */
const renderCard = (topLangs: TopLangData, options: CardOptions<TopLangOptions> = {}): string => {
  const {
    hide_title = false,
    hide_border = false,
    card_width,
    hide_langs,
    hide_progress,
    hide_values,
    layout,
    title,
    locale,
    langs_count = getDefaultLanguagesCountByLayout({ layout, hide_progress }),
    border_radius,
    disable_animations,
    value_format = 'percent',
  } = options;

  const t = localize(langCardLocales, locale);

  const { langs, totalLanguageSize } = trimTopLanguages(topLangs, langs_count, hide_langs);

  let width: number = DEFAULT_CARD_WIDTH;
  if (card_width && !Number.isNaN(card_width)) {
    width = Math.max(card_width, MIN_CARD_WIDTH);
  }
  let height = calculateNormalLayoutHeight(langs.length);

  const { lightColors, darkColors } = getLightDarkColors(options);

  let finalLayout: Child;
  if (langs.length === 0) {
    height = COMPACT_LAYOUT_BASE_HEIGHT;
    finalLayout = noLanguagesDataNode({
      text: t.noData(),
      layout,
    });
  } else if (layout === 'pie') {
    height = calculatePieLayoutHeight(langs.length);
    finalLayout = renderPieLayout(langs, totalLanguageSize, value_format, hide_values);
  } else if (layout === 'donut-vertical') {
    height = calculateDonutVerticalLayoutHeight(langs.length);
    finalLayout = renderDonutVerticalLayout(langs, totalLanguageSize, value_format, hide_values);
  } else if (layout === 'compact' || hide_progress === true) {
    height = calculateCompactLayoutHeight(langs.length) + (hide_progress ? -25 : 0);

    finalLayout = renderCompactLayout(
      langs,
      width,
      totalLanguageSize,
      hide_progress,
      value_format,
      hide_values,
    );
  } else if (layout === 'donut') {
    height = calculateDonutLayoutHeight(langs.length);
    // A donut defaults a step wider so the chart has its room; a width asked for
    // explicitly keeps the extra it has always been given instead of being snapped.
    width = width === DEFAULT_CARD_WIDTH ? CARD_STYLE.width.standard : width + DONUT_EXTRA_WIDTH;
    finalLayout = renderDonutLayout(langs, width, totalLanguageSize, value_format, hide_values);
  } else {
    finalLayout = renderNormalLayout(langs, width, totalLanguageSize, value_format, hide_values);
  }

  const card = new Card({
    customTitle: title,
    defaultTitle: t.title(),
    titlePrefixIcon: CARD_ICON.topLanguages,
    width,
    height,
    border_radius,
    colors: { light: lightColors, dark: darkColors },
  });

  if (disable_animations) {
    card.disableAnimations();
  }

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  card.setCSS({
    light: ({ textColor, progBarBgColor }) => [
      atRule(
        '@keyframes slideInAnimation',
        rule('from', { width: 0 }),
        // Invalid on purpose — `calc` needs spaces around its `-`. Browsers drop the
        // declaration and animate to the rect's own width, which is the reveal the mask wants.
        rule('to', { width: 'calc(100%-100px)' }),
      ),
      atRule(
        '@keyframes growWidthAnimation',
        rule('from', { width: 0 }),
        rule('to', { width: '100%' }),
      ),
      rule('.stat', {
        font: font('regular', 'body'),
        fill: textColor,
      }),
      firefoxFontSize(['.stat'], 'small'),
      rule('.bold', { 'font-weight': CARD_STYLE.fontWeight.semibold }),
      rule('.lang-name', { font: font('regular', 'micro'), fill: textColor }),
      rule('.stagger', { opacity: 0, animation: 'fadeInAnimation 0.3s ease-in-out forwards' }),
      rule('#rect-mask rect', { animation: 'slideInAnimation 1s ease-in-out forwards' }),
      rule('.lang-progress', { animation: 'growWidthAnimation 0.6s ease-in-out forwards' }),
      rule('.progress-background', { fill: progBarBgColor }),
    ],
    dark: ({ textColor, progBarBgColor }) => [
      rule('.stat', { fill: textColor }),
      rule('.lang-name', { fill: textColor }),
      rule('.progress-background', { fill: progBarBgColor }),
    ],
  });

  // `role="img"` hides the inner text from assistive tech, so everything the card
  // shows has to be repeated here.
  card.setAccessibilityLabel({
    title: card.title,
    desc: langs
      .map((lang) => `${lang.name} ${((lang.size / totalLanguageSize) * 100).toFixed(2)}%`)
      .join(', '),
  });

  if (layout === 'pie' || layout === 'donut-vertical') {
    return card.render(finalLayout);
  }

  return card.render(
    el('svg', { 'data-testid': 'lang-items', x: CARD_STYLE.padding.x }, finalLayout),
  );
};

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * They ride on the renderer so a list cannot be found without what draws it;
 * the api handler forwards them onto its own export, which is what a UI reads.
 */
const renderTopLanguages = Object.assign(renderCard, {
  OPTIONS: {
    layout: TOP_LANG_LAYOUTS,
    value_format: TOP_LANG_VALUE_FORMATS,
  },
});

export { trimTopLanguages, MIN_CARD_WIDTH, getDefaultLanguagesCountByLayout, renderTopLanguages };
