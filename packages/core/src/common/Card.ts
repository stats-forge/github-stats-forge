import type { Child, CssChild, MarkupElement } from '../markup/index.js';
import { atRule, cssComment, el, renderMarkup, rule, style } from '../markup/index.js';

import { getCardColors, isPrefixedHexColor, isValidGradient } from './color.js';
import type { CardColors } from './color.js';
import { flexLayout } from './render.js';

/**
 * Builds the card CSS for one color scheme from that scheme's resolved colors.
 */
type CardCSSBuilder = (colors: CardColors) => Array<CssChild>;

/** Stops every animation, whether the reader asked or the card did. */
const NO_MOTION = {
  'animation-duration': '0s !important',
  'animation-delay': '0s !important',
} as const;

/**
 * Retrieves css animations for a card.
 *
 * @returns Animation css.
 */
const getAnimations = (): Array<CssChild> => [
  cssComment('Animations'),
  atRule(
    '@keyframes scaleInAnimation',
    rule('from', { transform: 'translate(-5px, 5px) scale(0)' }),
    rule('to', { transform: 'translate(-5px, 5px) scale(1)' }),
  ),
  atRule('@keyframes fadeInAnimation', rule('from', { opacity: 0 }), rule('to', { opacity: 1 })),
  atRule('@media (prefers-reduced-motion: reduce)', rule('*', NO_MOTION)),
];

/** One `linearGradient` definition, built from an angle followed by its stops. */
const buildGradientDef = (id: string, bgColor: Array<string>): MarkupElement => {
  const gradients = bgColor.slice(1);
  return el(
    'linearGradient',
    {
      id,
      gradientTransform: `rotate(${String(bgColor[0])})`,
      gradientUnits: 'userSpaceOnUse',
    },
    gradients.map((grad, index) =>
      el('stop', {
        offset: `${(index * 100) / (gradients.length - 1)}%`,
        'stop-color': `#${grad}`,
      }),
    ),
  );
};

class Card {
  width: number;
  height: number;
  hideBorder: boolean;
  hideTitle: boolean;
  border_radius: number;
  colors: { light: CardColors; dark: CardColors | null };
  title: string;
  css: Array<CssChild>;
  darkCss: Array<CssChild>;
  paddingX: number;
  paddingY: number;
  titlePrefixIcon: Child;
  animations: boolean;
  a11yTitle: string;
  a11yDesc: string;

  /**
   * Creates a new card instance.
   */
  constructor({
    width = 100,
    height = 100,
    border_radius = 8,
    colors = { light: getCardColors({}), dark: null },
    customTitle,
    defaultTitle = '',
    titlePrefixIcon,
  }: {
    width?: number;
    height?: number;
    // `| undefined`: card callers forward possibly-undefined query options
    border_radius?: number | undefined;
    colors?: { light: CardColors; dark: CardColors | null };
    customTitle?: string | undefined;
    defaultTitle?: string;
    titlePrefixIcon?: Child;
  }) {
    this.width = width;
    this.height = height;

    this.hideBorder = false;
    this.hideTitle = false;

    this.border_radius = Number.parseFloat(String(border_radius));

    this.colors = colors;
    this.title = customTitle ?? defaultTitle;

    this.css = [];
    this.darkCss = [];

    this.paddingX = 25;
    this.paddingY = 35;
    this.titlePrefixIcon = titlePrefixIcon;
    this.animations = true;
    this.a11yTitle = '';
    this.a11yDesc = '';
  }

  disableAnimations(): void {
    this.animations = false;
  }

  setAccessibilityLabel({ title, desc }: { title: string; desc: string }): void {
    this.a11yTitle = title;
    this.a11yDesc = desc;
  }

  /**
   * Sets the card CSS for light and dark mode.
   *
   * Each builder receives the colors of its own color scheme,
   * so a card never handles a missing dark palette itself:
   * `dark` runs only when the card has dark colors, and always with non-null ones.
   */
  setCSS({ light, dark }: { light: CardCSSBuilder; dark: CardCSSBuilder }): void {
    this.css = light(this.colors.light);
    this.darkCss = this.colors.dark ? dark(this.colors.dark) : [];
  }

  setHideBorder(value: boolean): void {
    this.hideBorder = value;
  }

  setHideTitle(value: boolean): void {
    if (value && !this.hideTitle) {
      this.height -= 30;
    }
    if (!value && this.hideTitle) {
      this.height += 30;
    }
    this.hideTitle = value;
  }

  setTitle(text: string): void {
    this.title = text;
  }

  /** @returns The rendered card title. */
  renderTitle(): MarkupElement {
    return el(
      'g',
      {
        'data-testid': 'card-title',
        transform: `translate(${this.paddingX}, ${this.paddingY})`,
      },
      flexLayout({
        items: [
          this.titlePrefixIcon &&
            el(
              'svg',
              {
                class: 'icon',
                x: 0,
                y: -13,
                viewBox: '0 0 16 16',
                version: '1.1',
                width: 16,
                height: 16,
              },
              this.titlePrefixIcon,
            ),
          el('text', { x: 0, y: 0, class: 'header', 'data-testid': 'header' }, this.title),
        ],
        gap: 25,
      }),
    );
  }

  /** @returns The card's gradient definitions, or nothing when no color is a gradient. */
  renderGradient(): Child {
    if (
      typeof this.colors.light.bgColor === 'object' &&
      !isValidGradient(this.colors.light.bgColor)
    ) {
      throw new Error(`Invalid gradient: ${this.colors.light.bgColor.join(',')}`);
    }
    if (
      this.colors.dark &&
      typeof this.colors.dark.bgColor === 'object' &&
      !isValidGradient(this.colors.dark.bgColor)
    ) {
      throw new Error(`Invalid dark gradient: ${this.colors.dark.bgColor.join(',')}`);
    }

    const defs = [
      typeof this.colors.light.bgColor === 'object' &&
        buildGradientDef('gradient', this.colors.light.bgColor),
      this.colors.dark &&
        typeof this.colors.dark.bgColor === 'object' &&
        buildGradientDef('gradient-dark', this.colors.dark.bgColor),
    ].filter(Boolean);

    return defs.length === 0 ? undefined : el('defs', {}, defs);
  }

  /**
   * Builds the @media (prefers-color-scheme: dark) CSS block for the card.
   * Returns nothing when no dark colors are set.
   */
  private renderDarkMediaBlock(): CssChild {
    if (!this.colors.dark) {
      return undefined;
    }

    const bgFill =
      typeof this.colors.dark.bgColor === 'object'
        ? 'url(#gradient-dark)'
        : this.colors.dark.bgColor;

    return atRule(
      '@media (prefers-color-scheme: dark)',
      rule('.header', { fill: this.colors.dark.titleColor }),
      rule('.card-bg', { fill: bgFill, stroke: this.colors.dark.borderColor }),
      this.darkCss,
    );
  }

  /** @returns The rendered card. */
  render(body: Child): string {
    if (!Number.isFinite(this.border_radius)) {
      throw new TypeError(`Invalid border radius: "${this.border_radius}"`);
    }
    if (!isPrefixedHexColor(this.colors.light.titleColor)) {
      throw new Error(`Invalid title color: "${this.colors.light.titleColor}"`);
    }
    if (!isPrefixedHexColor(this.colors.light.borderColor)) {
      throw new Error(`Invalid border color: "${this.colors.light.borderColor}"`);
    }
    if (
      !(typeof this.colors.light.bgColor === 'object'
        ? isValidGradient(this.colors.light.bgColor)
        : isPrefixedHexColor(this.colors.light.bgColor))
    ) {
      throw new Error(`Invalid background color: ${String(this.colors.light.bgColor)}`);
    }

    return renderMarkup(
      el(
        'svg',
        {
          width: this.width,
          height: this.height,
          viewBox: `0 0 ${this.width} ${this.height}`,
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
          role: 'img',
          'aria-labelledby': 'titleId descId',
        },
        el('title', { id: 'titleId' }, this.a11yTitle),
        el('desc', { id: 'descId' }, this.a11yDesc),
        style(
          rule('.header', {
            font: "600 18px 'Segoe UI', Ubuntu, Sans-Serif",
            fill: this.colors.light.titleColor,
            animation: 'fadeInAnimation 0.8s ease-in-out forwards',
          }),
          atRule(
            '@supports(-moz-appearance: auto)',
            cssComment('Selector detects Firefox'),
            rule('.header', { 'font-size': '15.5px' }),
          ),
          this.css,
          this.renderDarkMediaBlock(),
          getAnimations(),
          !this.animations && rule('*', NO_MOTION),
        ),
        this.renderGradient(),
        el('rect', {
          'data-testid': 'card-bg',
          class: 'card-bg',
          x: 0.5,
          y: 0.5,
          rx: this.border_radius,
          height: '99%',
          stroke: this.colors.light.borderColor,
          width: this.width - 1,
          fill:
            typeof this.colors.light.bgColor === 'object'
              ? 'url(#gradient)'
              : this.colors.light.bgColor,
          'stroke-opacity': this.hideBorder ? 0 : 1,
        }),
        !this.hideTitle && this.renderTitle(),
        el(
          'g',
          {
            'data-testid': 'main-card-body',
            transform: `translate(0, ${this.hideTitle ? this.paddingX : this.paddingY + 20})`,
          },
          body,
        ),
      ),
    );
  }
}

export { Card };
