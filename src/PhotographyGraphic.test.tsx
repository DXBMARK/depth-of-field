import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import PhotographyGraphic from "./PhotographyGraphic";

test("renders the normalized accessible scene with focus labels", () => {
  const markup = renderToStaticMarkup(
    <PhotographyGraphic
      distanceToSubjectInInches={612.1 / 2.54}
      nearFocalPointInInches={535 / 2.54}
      farFocalPointInInches={715 / 2.54}
      visualSceneMaxInches={1000 / 2.54}
      subject="Human"
      focalLength={47}
      aperture={1.8}
      system="Metric"
      verticalFieldOfView={28.6}
      textColor="#0B1736"
    />
  );

  assert.match(markup, /viewBox="0 0 1000 470"/i);
  assert.match(markup, /preserveAspectRatio="xMidYMid meet"/i);
  assert.match(markup, /role="img"/i);
  assert.match(markup, /Near focus/i);
  assert.match(markup, /Depth of field/i);
  assert.match(markup, /Far focus/i);
  assert.match(markup, /data-testid="fov-cone"/i);
  assert.match(markup, /data-testid="optical-axis"/i);
  assert.match(markup, /data-testid="scene-subject"/i);
  assert.match(markup, /data-testid="near-focus-line"/i);
  assert.match(markup, /data-testid="dof-zone"/i);
  assert.doesNotMatch(markup, /preserveAspectRatio="none"/i);
});
