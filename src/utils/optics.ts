export const MM_PER_INCH = 25.4;

export type OpticsInput = {
  focalLengthMm: number;
  aperture: number;
  circleOfConfusionMm: number;
  subjectDistanceInches: number;
  sensorHeightMm: number;
};

export type OpticsResult = {
  subjectDistanceInches: number;
  hyperfocalInches: number;
  nearInches: number;
  farInches: number;
  depthOfFieldInches: number;
  farIsInfinite: boolean;
  verticalFovDegrees: number;
};

function requirePositive(name: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite positive number`);
  }
}

/**
 * Thin-lens depth-of-field convention used by this simulator.
 *
 * H  = f + f² / (N × c)
 * Dn = Hs / (H + (s - f))
 * Df = Hs / (H - (s - f))
 *
 * The UI reports the far limit as infinity when the subject is focused
 * at or beyond the hyperfocal distance.
 *
 * Distances are calculated internally from the lens plane.
 */
export function calculateOptics({
  focalLengthMm,
  aperture,
  circleOfConfusionMm,
  subjectDistanceInches,
  sensorHeightMm,
}: OpticsInput): OpticsResult {
  requirePositive("focalLengthMm", focalLengthMm);
  requirePositive("aperture", aperture);
  requirePositive("circleOfConfusionMm", circleOfConfusionMm);
  requirePositive("subjectDistanceInches", subjectDistanceInches);
  requirePositive("sensorHeightMm", sensorHeightMm);

  const subjectDistanceMm = subjectDistanceInches * MM_PER_INCH;
  const hyperfocalMm =
    focalLengthMm +
    (focalLengthMm * focalLengthMm) / (aperture * circleOfConfusionMm);
  const nearMm =
    (hyperfocalMm * subjectDistanceMm) /
    (hyperfocalMm + (subjectDistanceMm - focalLengthMm));
  const farDenominatorMm =
    hyperfocalMm - (subjectDistanceMm - focalLengthMm);

  const farIsInfinite =
    subjectDistanceMm >= hyperfocalMm || farDenominatorMm <= 0;
  const farMm = farIsInfinite
    ? Number.POSITIVE_INFINITY
    : (hyperfocalMm * subjectDistanceMm) / farDenominatorMm;
  const depthOfFieldMm = farIsInfinite
    ? Number.POSITIVE_INFINITY
    : farMm - nearMm;
  const verticalFovDegrees =
    (2 * Math.atan(sensorHeightMm / (2 * focalLengthMm)) * 180) / Math.PI;

  return {
    subjectDistanceInches,
    hyperfocalInches: hyperfocalMm / MM_PER_INCH,
    nearInches: nearMm / MM_PER_INCH,
    farInches: farIsInfinite
      ? Number.POSITIVE_INFINITY
      : farMm / MM_PER_INCH,
    depthOfFieldInches: farIsInfinite
      ? Number.POSITIVE_INFINITY
      : depthOfFieldMm / MM_PER_INCH,
    farIsInfinite,
    verticalFovDegrees,
  };
}
