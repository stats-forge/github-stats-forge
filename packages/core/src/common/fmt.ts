import type { Locale } from './localize.ts';
import { intlTag } from './localize.ts';

/** Built once per tag and digits: building a formatter costs far more than formatting with one. */
const decimalFormats = new Map<string, Intl.NumberFormat>();

/**
 * A figure with the locale's decimal separator, kept in Latin digits and ungrouped so it
 * measures as the English one does.
 *
 * @returns The figure, to between `minimum` and `maximum` decimals.
 */
const formatDecimal = (
  value: number,
  locale: Locale | undefined,
  minimum: number,
  maximum = minimum,
): string => {
  const tag = intlTag(locale);
  const key = `${tag} ${String(minimum)} ${String(maximum)}`;
  let format = decimalFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(tag, {
      minimumFractionDigits: minimum,
      maximumFractionDigits: maximum,
      numberingSystem: 'latn',
      useGrouping: false,
    });
    decimalFormats.set(key, format);
  }
  return format.format(value);
};

/**
 * Retrieves num with suffix k(thousands) precise to given decimal places.
 *
 * @returns The formatted number.
 */
const kFormatter = (
  num: number,
  locale: Locale | undefined,
  /** Decimals, as `clampPrecision` leaves them; the abbreviation's own default when absent. */
  precision?: number,
): string | number => {
  if (precision !== undefined) {
    return `${formatDecimal(num / 1000, locale, precision)}k`;
  }

  if (Math.abs(num) < 1000) {
    return num;
  }

  return `${formatDecimal(num / 1000, locale, 0, 1)}k`;
};

/**
 * Convert bytes to a human-readable string representation.
 *
 * @throws {Error} If bytes is negative or too large.
 *
 * @returns The human-readable representation of bytes.
 */
const formatBytes = (bytes: number, locale: Locale | undefined): string => {
  if (bytes < 0) {
    throw new Error('Bytes must be a non-negative number');
  }

  if (bytes === 0) {
    return '0 B';
  }

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  const base = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(base));

  const unit = sizes[i];
  if (unit === undefined) {
    throw new Error('Bytes is too large to convert to a human-readable string');
  }

  return `${formatDecimal(bytes / base ** i, locale, 1)} ${unit}`;
};

export { formatBytes, formatDecimal, kFormatter };
