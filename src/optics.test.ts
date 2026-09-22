import test from "node:test";
import assert from "node:assert/strict";
import { calculateOptics } from "./utils/optics";

const closeTo = (actual: number, expected: number, tolerance: number) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
};

test("47mm f/1.8 full-frame baseline matches expected optical values", () => {
  const result = calculateOptics({
    focalLengthMm: 47,
    aperture: 1.8,
    circleOfConfusionMm: 0.029,
    subjectDistanceInches: 612.1 / 2.54,
    sensorHeightMm: 24,
  });

  closeTo(result.nearInches * 2.54, 535.35, 0.15);
  closeTo(result.farInches * 2.54, 714.55, 0.15);
  closeTo(result.depthOfFieldInches * 2.54, 179.2, 0.2);
  closeTo(result.hyperfocalInches * 2.54, 4236.5, 0.2);
  closeTo(result.verticalFovDegrees, 28.645, 0.01);
  assert.equal(result.farIsInfinite, false);
});

test("focusing at hyperfocal exposes an infinite far limit", () => {
  const initial = calculateOptics({
    focalLengthMm: 47,
    aperture: 1.8,
    circleOfConfusionMm: 0.029,
    subjectDistanceInches: 612.1 / 2.54,
    sensorHeightMm: 24,
  });
  const result = calculateOptics({
    focalLengthMm: 47,
    aperture: 1.8,
    circleOfConfusionMm: 0.029,
    subjectDistanceInches: initial.hyperfocalInches,
    sensorHeightMm: 24,
  });

  assert.equal(result.farIsInfinite, true);
  assert.equal(result.farInches, Number.POSITIVE_INFINITY);
  assert.equal(result.depthOfFieldInches, Number.POSITIVE_INFINITY);
});

test(
  "vertical field of view decreases monotonically as focal length increases",
  () => {
    const focalLengths = [14, 47, 85, 200];
    const fovs = focalLengths.map(
      (focalLengthMm) =>
        calculateOptics({
          focalLengthMm,
          aperture: 1.8,
          circleOfConfusionMm: 0.029,
          subjectDistanceInches: 612.1 / 2.54,
          sensorHeightMm: 24,
        }).verticalFovDegrees
    );

    assert.ok(
      fovs[0] > fovs[1] && fovs[1] > fovs[2] && fovs[2] > fovs[3],
      `Expected FOV to decrease with focal length: ${JSON.stringify(fovs)}`
    );
    closeTo(fovs[0], 81.2026, 0.01);
    closeTo(fovs[1], 28.6454, 0.01);
    closeTo(fovs[2], 16.0714, 0.01);
    closeTo(fovs[3], 6.8673, 0.01);
  }
);

test("depth of field increases as aperture is stopped down", () => {
  const apertures = [1.8, 5.6, 11];
  const results = apertures.map((aperture) =>
    calculateOptics({
      focalLengthMm: 47,
      aperture,
      circleOfConfusionMm: 0.029,
      subjectDistanceInches: 612.1 / 2.54,
      sensorHeightMm: 24,
    })
  );
  const depthsCm = results.map((result) => result.depthOfFieldInches * 2.54);

  assert.ok(
    depthsCm.every(Number.isFinite),
    `Expected finite DOF values: ${JSON.stringify(depthsCm)}`
  );
  assert.ok(
    depthsCm[0] < depthsCm[1] && depthsCm[1] < depthsCm[2],
    `Expected DOF to increase when stopping down: ${JSON.stringify(depthsCm)}`
  );
  closeTo(depthsCm[0], 179.2009, 0.25);
  closeTo(depthsCm[1], 679.3007, 0.5);
  closeTo(depthsCm[2], 4426.2683, 2);
});

test("hyperfocal distance decreases as aperture is stopped down", () => {
  const apertures = [1.8, 5.6, 11];
  const hyperfocalCm = apertures.map(
    (aperture) =>
      calculateOptics({
        focalLengthMm: 47,
        aperture,
        circleOfConfusionMm: 0.029,
        subjectDistanceInches: 612.1 / 2.54,
        sensorHeightMm: 24,
      }).hyperfocalInches * 2.54
  );

  assert.ok(
    hyperfocalCm[0] > hyperfocalCm[1] &&
      hyperfocalCm[1] > hyperfocalCm[2],
    `Expected hyperfocal distance to decrease when stopping down: ${JSON.stringify(
      hyperfocalCm
    )}`
  );
});

test(
  "a larger sensor height produces a wider vertical FOV at the same focal length",
  () => {
    const fullFrame = calculateOptics({
      focalLengthMm: 47,
      aperture: 1.8,
      circleOfConfusionMm: 0.029,
      subjectDistanceInches: 612.1 / 2.54,
      sensorHeightMm: 24,
    });
    const apsC = calculateOptics({
      focalLengthMm: 47,
      aperture: 1.8,
      circleOfConfusionMm: 0.019,
      subjectDistanceInches: 612.1 / 2.54,
      sensorHeightMm: 15.6,
    });

    assert.ok(fullFrame.verticalFovDegrees > apsC.verticalFovDegrees);
    closeTo(fullFrame.verticalFovDegrees, 28.6454, 0.01);
    closeTo(apsC.verticalFovDegrees, 18.8456, 0.01);
  }
);

test("finite focus limits contain the subject distance", () => {
  const subjectDistance = 612.1 / 2.54;
  const result = calculateOptics({
    focalLengthMm: 47,
    aperture: 1.8,
    circleOfConfusionMm: 0.029,
    subjectDistanceInches: subjectDistance,
    sensorHeightMm: 24,
  });

  assert.equal(result.farIsInfinite, false);
  assert.ok(result.nearInches < subjectDistance);
  assert.ok(result.farInches > subjectDistance);
  assert.ok(result.depthOfFieldInches > 0);
});

test("rejects invalid optical inputs", () => {
  const base = {
    focalLengthMm: 47,
    aperture: 1.8,
    circleOfConfusionMm: 0.029,
    subjectDistanceInches: 612.1 / 2.54,
    sensorHeightMm: 24,
  };

  assert.throws(() => calculateOptics({ ...base, focalLengthMm: 0 }), RangeError);
  assert.throws(() => calculateOptics({ ...base, aperture: 0 }), RangeError);
  assert.throws(
    () => calculateOptics({ ...base, circleOfConfusionMm: 0 }),
    RangeError
  );
  assert.throws(
    () => calculateOptics({ ...base, subjectDistanceInches: 0 }),
    RangeError
  );
  assert.throws(() => calculateOptics({ ...base, sensorHeightMm: 0 }), RangeError);
});
