import type { Child, CssChild, MarkupElement } from '../markup/index.ts';
import { atRule, changedBy, cssComment, el, renderMarkup, rule, style } from '../markup/index.ts';

import { CARD_STYLE, firefoxFontSize, font } from './brand.ts';
import { HEAT_ID, HEAT_PAINT, getCardColors, isPrefixedHexColor } from './color.ts';
import type { CardColors } from './color.ts';
import { flexLayout } from './render.ts';
import { measureText } from './text.ts';

/**
 * Builds the card CSS for one color scheme from that scheme's resolved colors.
 */
type CardCSSBuilder = (colors: CardColors) => Array<CssChild>;

/** How far the title sits right of the icon before it. */
const TITLE_ICON_GAP = 25;
/** `measureText` reads regular widths; the semibold header draws about a tenth wider. */
const TITLE_SEMIBOLD_WIDENING = 1.1;
/** Below this a shrunk title stops being readable, so a card narrower still crops it. */
const TITLE_MIN_FONT_SIZE = CARD_STYLE.fontSize.title / 2;

/** @returns How wide the semibold title draws at its own size. */
const titleWidth = (title: string): number =>
  measureText(title, CARD_STYLE.fontSize.title) * TITLE_SEMIBOLD_WIDENING;

/** @returns What a title room leaves on a card of `width`, beside an icon if it has one. */
const titleRoom = (width: number, withIcon: boolean): number =>
  width - CARD_STYLE.padding.x * 2 - (withIcon ? TITLE_ICON_GAP : 0);

/**
 * Shrunk rather than cut, so a long name or translation is still read whole; a smaller font,
 * unlike `textLength`, cannot stretch a title the estimate overrated.
 *
 * @returns The px size a title too wide for `room` is drawn at, or `undefined` when it fits.
 */
const shrunkTitleSize = (title: string, room: number): number | undefined => {
  const width = titleWidth(title);
  if (width <= room) {
    return undefined;
  }
  return Math.max(
    TITLE_MIN_FONT_SIZE,
    Math.floor((CARD_STYLE.fontSize.title * room * 10) / width) / 10,
  );
};

/**
 * For a card with a shorter title to fall back on: a name shrunk past the lead size reads worse
 * than no name.
 *
 * @returns Whether `title` fits a card of `width`, beside the icon, at the lead size or larger.
 */
const titleFits = (title: string, width: number): boolean =>
  (shrunkTitleSize(title, titleRoom(width, true)) ?? CARD_STYLE.fontSize.title) >=
  CARD_STYLE.fontSize.lead;

/** Stops every animation, whether the reader asked or the card did. */
const NO_MOTION = {
  'animation-duration': '0s !important',
  'animation-delay': '0s !important',
} as const;

/**
 * Retrieves css animations for a card.
 * Each fills `backwards` over a base style that is its last frame, so a renderer that skips
 * animations still draws the whole card.
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
  atRule('@keyframes trailAnimation', rule('from', { transform: 'scaleX(0)' })),
  atRule('@media (prefers-reduced-motion: reduce)', rule('*', NO_MOTION)),
];

/** @returns The glow's opacity where it fades into the last stop, to three places. */
const glowEdgeOpacity = (colors: CardColors): number =>
  Math.round(colors.glowOpacity * CARD_STYLE.glow.edgeShare * 1000) / 1000;

/** @returns The band's opacity where it cools into the last stop, to three places. */
const bandEdgeOpacity = (colors: CardColors): number =>
  Math.round(colors.bandOpacity * CARD_STYLE.band.edgeShare * 1000) / 1000;

/** @returns The band's stops, classed so the dark block can recolor them. */
const bandStops = (colors: CardColors): Array<MarkupElement> =>
  ([0, 0.55, 1] as const).map((offset, index) =>
    el('stop', {
      offset,
      class: `band-${String(index)}`,
      'stop-color': colors.heat[index],
      'stop-opacity': index === 2 ? bandEdgeOpacity(colors) : colors.bandOpacity,
    }),
  );

/**
 * A heat stop. It carries the light color as an attribute, for a renderer that skips CSS,
 * and a class the dark block recolors.
 */
const heatStop = (
  offset: number,
  colors: CardColors,
  index: 0 | 1 | 2,
  opacity?: number,
): MarkupElement =>
  el('stop', {
    offset,
    class: `heat-${String(index)}`,
    'stop-color': colors.heat[index],
    'stop-opacity': opacity,
  });

/**
 * The heat gradients every card paints with, under the ids in {@link HEAT_ID}, plus the ring
 * gradient and the bloom filter for a card that burns.
 *
 * @returns The definitions.
 */
const renderHeatDefs = (colors: CardColors, burns: boolean): Array<Child> => {
  const stops = (): Array<MarkupElement> => [
    heatStop(0, colors, 0),
    heatStop(0.55, colors, 1),
    heatStop(1, colors, 2),
  ];

  return [
    el('linearGradient', { id: HEAT_ID.line, x1: 0, y1: 0, x2: 1, y2: 0 }, stops()),
    burns && el('linearGradient', { id: HEAT_ID.ring, x1: 0, y1: 1, x2: 1, y2: 0 }, stops()),
    el('linearGradient', { id: HEAT_ID.trail, x1: 0, y1: 0, x2: 1, y2: 0 }, [
      heatStop(0, colors, 0),
      heatStop(0.3, colors, 1),
      heatStop(0.7, colors, 2, 0.5),
      heatStop(1, colors, 2, 0),
    ]),
    el('linearGradient', { id: HEAT_ID.band, x1: 0, y1: 0, x2: 1, y2: 0 }, bandStops(colors)),
    el('radialGradient', { id: HEAT_ID.glow, cx: 0.95, cy: 1.05, r: 0.8 }, [
      el('stop', {
        offset: 0,
        class: 'glow-core',
        'stop-color': colors.heat[1],
        'stop-opacity': colors.glowOpacity,
      }),
      el('stop', {
        offset: 0.45,
        class: 'glow-edge',
        'stop-color': colors.heat[2],
        'stop-opacity': glowEdgeOpacity(colors),
      }),
      heatStop(1, colors, 2, 0),
    ]),
    burns &&
      el(
        'filter',
        { id: HEAT_ID.bloom, x: '-50%', y: '-50%', width: '200%', height: '200%' },
        el('feGaussianBlur', { stdDeviation: CARD_STYLE.bloom.blur, result: 'bloom' }),
        el(
          'feMerge',
          {},
          el('feMergeNode', { in: 'bloom' }),
          el('feMergeNode', { in: 'SourceGraphic' }),
        ),
      ),
  ];
};

/** @returns The rules recoloring the heat stops, for the dark block. */
const heatStopRules = (colors: CardColors): Array<CssChild> => [
  colors.heat.map((color, index) => rule(`.heat-${String(index)}`, { 'stop-color': color })),
  rule('.glow-core', { 'stop-color': colors.heat[1], 'stop-opacity': colors.glowOpacity }),
  rule('.glow-edge', {
    'stop-color': colors.heat[2],
    'stop-opacity': glowEdgeOpacity(colors),
  }),
  colors.heat.map((color, index) =>
    rule(`.band-${String(index)}`, {
      'stop-color': color,
      'stop-opacity': index === 2 ? bandEdgeOpacity(colors) : colors.bandOpacity,
    }),
  ),
];

/** Everything a card is drawn with; all but the title and its description have a default. */
interface CardInit {
  width?: number;
  /** The height with the title shown; `hideTitle` takes the title's room off it. */
  height?: number;
  // `| undefined`: card callers forward possibly-undefined query options
  border_radius?: number | undefined;
  colors?: { light: CardColors; dark: CardColors | null };
  title: string;
  titlePrefixIcon?: Child;
  /** What a screen reader announces first; the title unless a card has more to say. */
  accessibleTitle?: string;
  /** What a screen reader reads after it: the card's figures, in words. */
  description: string;
  hideBorder?: boolean;
  hideTitle?: boolean;
  animations?: boolean;
  /** Whether it draws with `HEAT_PAINT.ring` or `HEAT_PAINT.bloom`, which are defined only then. */
  burns?: boolean;
  /** The card's own CSS, built once per color scheme; the dark block keeps only what changes. */
  css?: CardCSSBuilder;
}

/** The room the title and its band take, which a card without a title gives back. */
const TITLE_ROOM = CARD_STYLE.padding.bodyOffsetY - CARD_STYLE.padding.x;

class Card {
  readonly width: number;
  readonly height: number;
  readonly hideBorder: boolean;
  readonly hideTitle: boolean;
  readonly border_radius: number;
  readonly colors: { light: CardColors; dark: CardColors | null };
  readonly title: string;
  readonly css: Array<CssChild>;
  readonly darkCss: Array<CssChild>;
  readonly paddingX = CARD_STYLE.padding.x;
  readonly paddingY = CARD_STYLE.padding.titleY;
  readonly titlePrefixIcon: Child;
  readonly animations: boolean;
  readonly burns: boolean;
  readonly a11yTitle: string;
  readonly a11yDesc: string;

  constructor({
    width = 100,
    height = 100,
    border_radius = 14,
    colors = { light: getCardColors(), dark: null },
    title,
    titlePrefixIcon,
    accessibleTitle = title,
    description,
    hideBorder = false,
    hideTitle = false,
    animations = true,
    burns = false,
    css = (): Array<CssChild> => [],
  }: CardInit) {
    this.width = width;
    this.height = hideTitle ? height - TITLE_ROOM : height;
    this.hideBorder = hideBorder;
    this.hideTitle = hideTitle;
    this.border_radius = border_radius;
    this.colors = colors;
    this.title = title;
    this.titlePrefixIcon = titlePrefixIcon;
    this.animations = animations;
    this.burns = burns;
    this.a11yTitle = accessibleTitle;
    this.a11yDesc = description;
    this.css = css(colors.light);
    this.darkCss = colors.dark ? changedBy(this.css, css(colors.dark)) : [];
  }

  /**
   * The trail starts under the icon and runs past the title's end, but never past the card's
   * inner edge.
   *
   * @returns The title, its icon and the heat trail under them.
   */
  renderTitle(titleSize: number): MarkupElement {
    const withIcon = Boolean(this.titlePrefixIcon);
    const drawn = (titleWidth(this.title) * titleSize) / CARD_STYLE.fontSize.title;
    const trailWidth = Math.min(
      (withIcon ? TITLE_ICON_GAP : 0) +
        Math.min(drawn, titleRoom(this.width, withIcon)) +
        CARD_STYLE.accent.overrun,
      this.width - this.paddingX * 2,
    );

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
                class: 'title-icon',
                x: 0,
                y: -13,
                viewBox: '0 0 16 16',
                version: '1.1',
                width: 16,
                height: 16,
              },
              this.titlePrefixIcon,
            ),
          el(
            'text',
            {
              x: 0,
              y: 0,
              class: 'header',
              'data-testid': 'header',
            },
            this.title,
          ),
        ],
        gap: TITLE_ICON_GAP,
      }),
      el('rect', {
        'data-testid': 'title-accent',
        class: 'title-accent',
        x: 0,
        y: CARD_STYLE.accent.y,
        width: Math.round(trailWidth * 10) / 10,
        height: CARD_STYLE.accent.height,
        rx: CARD_STYLE.accent.height / 2,
        fill: HEAT_PAINT.trail,
      }),
    );
  }

  /** Where the body starts, and so where the title band ends. */
  private get bodyOffset(): number {
    if (this.hideTitle) {
      return CARD_STYLE.padding.x;
    }
    return CARD_STYLE.padding.bodyOffsetY;
  }

  /**
   * The card's corner radius, capped at half the rect's sides. SVG caps `rx` and `ry` on their own
   * axes, which turns a round corner elliptical, so the card caps the one `rx` it draws itself.
   */
  private get corner(): number {
    return Math.min(this.border_radius, (this.width - 1) / 2, (this.height * 0.99) / 2);
  }

  /**
   * The band behind the title. Its top corners follow the card's own and its bottom ones stay
   * square, so it meets the body as an edge rather than a floating box.
   *
   * @returns The title band.
   */
  private renderTitleBand(): MarkupElement {
    const height = this.bodyOffset - CARD_STYLE.band.gap;
    const innerWidth = this.width - 1;
    const r = this.corner;
    const bandHeight = height - 0.5;

    if (r <= bandHeight) {
      return el('path', {
        'data-testid': 'title-band',
        d: `M0.5 ${0.5 + r}a${r} ${r} 0 0 1 ${r} ${-r}h${innerWidth - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${height - r - 0.5}h${-innerWidth}z`,
        fill: `url(#${HEAT_ID.band})`,
      });
    }

    // A corner deeper than the band: the band's sides follow the corners' arcs to its bottom.
    const inset = Math.round((r - Math.sqrt(r * r - (r - bandHeight) ** 2)) * 100) / 100;
    return el('path', {
      'data-testid': 'title-band',
      d: `M${0.5 + inset} ${height}A${r} ${r} 0 0 1 ${0.5 + r} 0.5h${innerWidth - 2 * r}A${r} ${r} 0 0 1 ${0.5 + innerWidth - inset} ${height}z`,
      fill: `url(#${HEAT_ID.band})`,
    });
  }

  /** @returns The card's heat definitions. */
  private renderDefs(): MarkupElement {
    return el('defs', {}, renderHeatDefs(this.colors.light, this.burns));
  }

  /**
   * Builds the @media (prefers-color-scheme: dark) CSS block for the card.
   * Returns nothing when no dark colors are set.
   */
  private renderDarkMediaBlock(): CssChild {
    if (!this.colors.dark) {
      return undefined;
    }

    return atRule(
      '@media (prefers-color-scheme: dark)',
      heatStopRules(this.colors.dark),
      rule('.title-icon', { fill: this.colors.dark.iconColor }),
      rule('.card-bg', {
        fill: this.colors.dark.bgColor,
        stroke: this.colors.dark.borderColor,
      }),
      this.darkCss,
    );
  }

  /** @returns The rendered card. */
  render(body: Child): string {
    if (!Number.isFinite(this.border_radius)) {
      throw new TypeError(`Invalid border radius: "${this.border_radius}"`);
    }
    const badStop = this.colors.light.heat.find((stop) => !isPrefixedHexColor(stop));
    if (badStop !== undefined) {
      throw new Error(`Invalid heat color: "${badStop}"`);
    }
    if (!isPrefixedHexColor(this.colors.light.borderColor)) {
      throw new Error(`Invalid border color: "${this.colors.light.borderColor}"`);
    }
    if (!isPrefixedHexColor(this.colors.light.bgColor)) {
      throw new Error(`Invalid background color: ${this.colors.light.bgColor}`);
    }

    const shrunk = shrunkTitleSize(
      this.title,
      titleRoom(this.width, Boolean(this.titlePrefixIcon)),
    );
    const firefoxSize =
      shrunk === undefined
        ? CARD_STYLE.titleFirefoxSize
        : Math.floor((shrunk * CARD_STYLE.titleFirefoxSize * 10) / CARD_STYLE.fontSize.title) / 10;

    const cardShape = {
      x: 0.5,
      y: 0.5,
      rx: this.corner,
      height: '99%',
      width: this.width - 1,
    };

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
          'aria-labelledby': 'title-id desc-id',
        },
        el('title', { id: 'title-id' }, this.a11yTitle),
        el('desc', { id: 'desc-id' }, this.a11yDesc),
        style(
          rule('.header', {
            font: font('semibold', 'title'),
            fill: HEAT_PAINT.line,
            animation: 'fadeInAnimation 0.8s ease-in-out backwards',
          }),
          cssComment(
            'The icon reads against the title rather than with it, so it keeps its own color.',
          ),
          rule('.title-icon', {
            fill: this.colors.light.iconColor,
            animation: 'fadeInAnimation 0.8s ease-in-out backwards',
          }),
          rule('.title-accent', {
            'transform-box': 'fill-box',
            'transform-origin': 'left center',
            animation: 'trailAnimation 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) 0.2s backwards',
          }),
          shrunk !== undefined && rule('.header', { 'font-size': `${String(shrunk)}px` }),
          // Not a style attribute, which would outrank Firefox's smaller size.
          firefoxFontSize(['.header'], firefoxSize),
          this.css,
          this.renderDarkMediaBlock(),
          getAnimations(),
          !this.animations && rule('*', NO_MOTION),
        ),
        this.renderDefs(),
        el('rect', {
          'data-testid': 'card-bg',
          class: 'card-bg',
          ...cardShape,
          stroke: this.colors.light.borderColor,
          fill: this.colors.light.bgColor,
          'stroke-opacity': this.hideBorder ? 0 : 1,
        }),
        el('rect', {
          'data-testid': 'card-glow',
          ...cardShape,
          fill: `url(#${HEAT_ID.glow})`,
        }),
        !this.hideTitle && this.renderTitleBand(),
        !this.hideTitle && this.renderTitle(shrunk ?? CARD_STYLE.fontSize.title),
        el(
          'g',
          {
            'data-testid': 'main-card-body',
            transform: `translate(0, ${this.bodyOffset})`,
          },
          body,
        ),
      ),
    );
  }
}

export { Card, titleFits };
