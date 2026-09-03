/**
 * Retrieves num with suffix k(thousands) precise to given decimal places.
 *
 * @returns The formatted number.
 */
const kFormatter = (num: number, precision?: number): string | number => {
  const abs = Math.abs(num);
  const sign = Math.sign(num);

  if (typeof precision === 'number' && !Number.isNaN(precision)) {
    return `${(sign * (abs / 1000)).toFixed(precision)}k`;
  }

  if (abs < 1000) {
    return sign * abs;
  }

  return `${sign * Number.parseFloat((abs / 1000).toFixed(1))}k`;
};

/**
 * Convert bytes to a human-readable string representation.
 *
 * @throws {Error} If bytes is negative or too large.
 *
 * @returns The human-readable representation of bytes.
 */
const formatBytes = (bytes: number): string => {
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

  return `${(bytes / base ** i).toFixed(1)} ${unit}`;
};

export { kFormatter, formatBytes };
