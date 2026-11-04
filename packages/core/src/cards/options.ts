import type { ThemeParams } from '../common/color.ts';

/**
 * Options every card accepts.
 * Cards hand these to `getLightDarkColors`, hence {@link ThemeParams}.
 */
export interface CommonCardOptions extends ThemeParams {
  border_radius: number;
  hide_border: boolean;
}

/** `Partial<T>` that also accepts an explicit `undefined`, as api handlers forward. */
export type CardOptions<T> = { [K in keyof T]?: T[K] | undefined };
