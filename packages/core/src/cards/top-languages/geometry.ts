/**
 * Convert degrees to radians.
 *
 * @returns Angle in radians.
 */
const degreesToRadians = (angleInDegrees: number): number => angleInDegrees * (Math.PI / 180);

/**
 * Convert radians to degrees.
 *
 * @returns Angle in degrees.
 */
const radiansToDegrees = (angleInRadians: number): number => angleInRadians / (Math.PI / 180);

/**
 * Convert polar coordinates to cartesian coordinates.
 *
 * @returns Cartesian coordinates.
 */
const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } => {
  const rads = degreesToRadians(angleInDegrees);
  return {
    x: centerX + radius * Math.cos(rads),
    y: centerY + radius * Math.sin(rads),
  };
};

/**
 * Convert cartesian coordinates to polar coordinates.
 *
 * @returns Polar coordinates.
 */
const cartesianToPolar = (
  centerX: number,
  centerY: number,
  x: number,
  y: number,
): { radius: number; angleInDegrees: number } => {
  const radius = Math.hypot(x - centerX, y - centerY);
  let angleInDegrees = radiansToDegrees(Math.atan2(y - centerY, x - centerX));
  if (angleInDegrees < 0) {
    angleInDegrees += 360;
  }
  return { radius, angleInDegrees };
};

/**
 * Calculates length of circle.
 *
 * @returns The length of the circle.
 */
const getCircleLength = (radius: number): number => 2 * Math.PI * radius;

export { cartesianToPolar, degreesToRadians, getCircleLength, polarToCartesian, radiansToDegrees };
