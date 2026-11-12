/**
 * Creates an asymmetric matcher for approximate numeric equality.
 *
 * This helper is intended for use in test frameworks (e.g., Jest) where
 * values need to be compared within a configurable decimal precision
 * instead of strict equality.
 *
 * The comparison succeeds when:
 *
 *   |actual - expected| < 10^(-precision)
 *
 * For example, with `precision = 3`, values must be within `0.001`.
 *
 * @returns An object implementing Jest-style asymmetric matcher methods.
 */
export function approxNumber(
  expected: number,
  /** decimal places of tolerance: higher is stricter, converted to epsilon = 10^-precision */
  precision = 10,
): {
  asymmetricMatch: (actual: unknown) => boolean;
  toAsymmetricMatcher: () => string;
} {
  return {
    asymmetricMatch(actual) {
      if (typeof actual !== 'number' || typeof expected !== 'number') {
        return false;
      }
      const epsilon = 10 ** -precision;
      return Math.abs(actual - expected) < epsilon;
    },
    toAsymmetricMatcher() {
      return `≈ ${expected} (precision ${precision})`;
    },
  };
}
