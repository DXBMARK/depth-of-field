import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { chromium, type Page } from "playwright";

const VITE_BIN = fileURLToPath(
  new URL("../node_modules/vite/bin/vite.js", import.meta.url)
);

async function getOpenPort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  server.close();
  await once(server, "close");

  if (!address || typeof address === "string") {
    throw new Error("Could not allocate a local test port");
  }

  return address.port;
}

async function startVite(port: number) {
  const appUrl = `http://127.0.0.1:${port}/depth-of-field/`;
  const server = spawn(
    process.execPath,
    [VITE_BIN, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  let output = "";
  server.stdout.on("data", (chunk) => (output += chunk.toString()));
  server.stderr.on("data", (chunk) => (output += chunk.toString()));

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(appUrl);
      if (response.ok) return { server, appUrl };
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  server.kill();
  throw new Error(`Vite server did not start:\n${output}`);
}

const localChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DESKTOP_VIEWPORT = { width: 1448, height: 1086 };
const FOCUS_LABEL_IDS = [
  "focus-label-near",
  "focus-label-dof",
  "focus-label-far",
] as const;

async function setFocalLength(page: Page, focalLength: number) {
  const slider = page.getByRole("slider", { name: "Focal length" });
  await slider.press("Home");

  for (let value = 3; value < focalLength; value += 1) {
    await slider.press("ArrowRight");
  }

  assert.equal(
    await page.getByTestId("focal-length-value").textContent(),
    `${focalLength} mm`
  );
}

async function assertFocusLabelsContained(page: Page, state: string) {
  const svg = page.getByTestId("scene-svg");
  const viewBoxWidth = Number(
    (await svg.getAttribute("viewBox"))?.split(/\s+/)[2]
  );

  assert.ok(Number.isFinite(viewBoxWidth), `${state}: invalid viewBox width`);

  for (const testId of FOCUS_LABEL_IDS) {
    const boxes = await page.getByTestId(testId).locator("text").evaluateAll(
      (elements) => elements.map((element) => {
        const box = (element as SVGGraphicsElement).getBBox();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      })
    );

    assert.equal(boxes.length, 2, `${state}: ${testId} should contain two text elements`);
    for (const box of boxes) {
      assert.ok(box.x >= 8, `${state}: ${testId} left overflow ${JSON.stringify(box)}`);
      assert.ok(
        box.x + box.width <= viewBoxWidth - 8,
        `${state}: ${testId} right overflow ${JSON.stringify(box)}/${viewBoxWidth}`
      );
      assert.ok(box.y >= 8, `${state}: ${testId} top overflow ${JSON.stringify(box)}`);
      assert.ok(
        box.y + box.height <= 72 - 4,
        `${state}: ${testId} scene overlap ${JSON.stringify(box)}`
      );
    }
  }
}

function parseRgb(value: string) {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  assert.ok(channels && channels.length === 3, `invalid RGB color: ${value}`);
  return channels;
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    const channels = parseRgb(color).map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

async function withApp(
  viewport: { width: number; height: number },
  run: (page: Page) => Promise<void>
) {
  const port = await getOpenPort();
  const { server, appUrl } = await startVite(port);
  const browser = await chromium.launch({
    headless: true,
    ...(existsSync(localChromePath) ? { executablePath: localChromePath } : {}),
  });

  try {
    const page = await browser.newPage({ viewport });
    await page.goto(appUrl, { waitUntil: "networkidle" });
    await run(page);
  } finally {
    await browser.close();
    server.kill();
    await once(server, "exit").catch(() => undefined);
  }
}

test("reference desktop fits and aligns the settings and help bottoms", async () => {
  await withApp(DESKTOP_VIEWPORT, async (page) => {
    await assertFocusLabelsContained(page, "baseline");

    const documentMetrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    assert.equal(
      documentMetrics.scrollHeight - documentMetrics.clientHeight,
      0,
      `desktop vertical overflow: ${JSON.stringify(documentMetrics)}`
    );
    assert.equal(
      documentMetrics.scrollWidth - documentMetrics.clientWidth,
      0,
      `desktop horizontal overflow: ${JSON.stringify(documentMetrics)}`
    );

    const settings = page.getByTestId("settings-panel");
    const settingsMetrics = await settings.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));

    assert.equal(
      settingsMetrics.scrollHeight - settingsMetrics.clientHeight,
      0,
      `settings overflow: ${JSON.stringify(settingsMetrics)}`
    );

    const simulatorBox = await page.getByTestId("simulator-card").boundingBox();
    const settingsBox = await settings.boundingBox();
    const helpBox = await page.getByTestId("help-card").boundingBox();
    const footerBox = await page.getByTestId("app-footer").boundingBox();

    assert.ok(simulatorBox && settingsBox && helpBox && footerBox, "expected layout boxes to exist");
    assert.ok(Math.abs(simulatorBox.y - settingsBox.y) <= 3, "main columns should align at the top");
    const settingsBottom = settingsBox.y + settingsBox.height;
    const helpBottom = helpBox.y + helpBox.height;
    assert.ok(
      Math.abs(settingsBottom - helpBottom) <= 4,
      `settings/help bottoms differ: ${settingsBottom}/${helpBottom}`
    );
    assert.ok(footerBox.y + footerBox.height <= 1086 + 1, "footer should remain inside the reference viewport");

    await page.screenshot({
      path: "artifacts/classroom-baseline-light.png",
      fullPage: false,
    });

    await page.getByRole("button", { name: "Switch to dark mode" }).click();

    await page
      .getByRole("button", { name: "Switch to light mode" })
      .waitFor({ state: "visible" });

    const appShellClass =
      (await page.getByTestId("app-shell").getAttribute("class")) ?? "";

    assert.match(appShellClass, /\bdark\b/);

    await assertFocusLabelsContained(page, "dark mode");
    const preset = page.getByRole("button", { name: "Webcam example" });

    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find(
        (element) => element.textContent?.trim() === "Webcam example"
      );

      if (!(button instanceof HTMLElement)) {
        return false;
      }

      const style = getComputedStyle(button);

      return (
        style.backgroundColor === "rgb(15, 23, 42)" &&
        style.color === "rgb(241, 245, 249)"
      );
    });

    const colors = await preset.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, backgroundColor: style.backgroundColor };
    });

    assert.equal(colors.backgroundColor, "rgb(15, 23, 42)", JSON.stringify(colors));
    assert.equal(colors.color, "rgb(241, 245, 249)");

    const ratio = contrastRatio(colors.color, colors.backgroundColor);
    assert.ok(ratio >= 4.5, `dark preset contrast ${ratio}: ${JSON.stringify(colors)}`);

    await page.screenshot({
      path: "artifacts/classroom-baseline-dark.png",
      fullPage: false,
    });
  });
});

test("focal scale keeps true positions while edge-aware labels stay separated", async () => {
  await withApp(DESKTOP_VIEWPORT, async (page) => {
    for (const label of ["3mm", "14mm", "28mm", "50mm", "85mm", "200mm", "400mm"]) {
      assert.equal(await page.getByText(label, { exact: true }).count(), 1);
    }

    assert.equal(
      await page.getByTestId("focal-length-value").textContent(),
      "47 mm"
    );

    const mark200 = await page.getByText("200mm", { exact: true }).boundingBox();
    const mark400 = await page.getByText("400mm", { exact: true }).boundingBox();
    assert.ok(mark200 && mark400);
    assert.ok(
      mark200.x + mark200.width < mark400.x,
      `200mm and 400mm touch: ${JSON.stringify({ mark200, mark400 })}`
    );

    await setFocalLength(page, 6);
    await assertFocusLabelsContained(page, "6mm f/1.8");

    await setFocalLength(page, 10);
    const thumb = await page.getByRole("slider", { name: "Focal length" }).boundingBox();
    const tick3 = await page.getByTestId("focal-length-mark-tick-3").boundingBox();
    const tick14 = await page.getByTestId("focal-length-mark-tick-14").boundingBox();
    assert.ok(thumb && tick3 && tick14);
    const thumbCentre = thumb.x + thumb.width / 2;
    const tick3Centre = tick3.x + tick3.width / 2;
    const tick14Centre = tick14.x + tick14.width / 2;
    assert.ok(
      thumbCentre > tick3Centre && thumbCentre < tick14Centre,
      `10mm is not between true 3mm/14mm ticks: ${thumbCentre}/${tick3Centre}/${tick14Centre}`
    );

    await page.screenshot({
      path: "artifacts/classroom-10mm-light.png",
      fullPage: false,
    });
  });
});

test("scene viewBox matches the wide frame without stretching", async () => {
  await withApp({ width: 1448, height: 1086 }, async (page) => {
    const frame = await page.getByTestId("scene-frame").boundingBox();
    const svg = page.getByTestId("scene-svg");
    const viewBox = (await svg.getAttribute("viewBox"))?.split(/\s+/).map(Number);

    assert.ok(frame && viewBox && viewBox.length === 4);

    const frameRatio = frame.width / frame.height;
    const viewBoxRatio = viewBox[2] / viewBox[3];

    assert.ok(
      Math.abs(frameRatio - viewBoxRatio) < 0.12,
      `scene ratio mismatch: frame=${frameRatio}, viewBox=${viewBoxRatio}`
    );
    assert.equal(await svg.getAttribute("preserveAspectRatio"), "xMidYMid meet");
  });
});

test("distance changes subject and focus geometry without changing FOV", async () => {
  await withApp({ width: 1448, height: 1086 }, async (page) => {
    const subject = page.getByTestId("scene-subject");
    const focusPlane = page.getByTestId("subject-focus-plane");
    const near = page.getByTestId("near-focus-line");
    const cone = page.getByTestId("fov-cone");

    const beforeSubject = await subject.boundingBox();
    const beforePlane = await focusPlane.getAttribute("x1");
    const beforeNear = await near.getAttribute("x1");
    const beforeCone = await cone.getAttribute("d");

    await page.getByRole("slider", { name: "Distance to subject" }).press("End");

    const afterSubject = await subject.boundingBox();
    const afterPlane = await focusPlane.getAttribute("x1");
    const afterNear = await near.getAttribute("x1");
    const afterCone = await cone.getAttribute("d");

    assert.ok(beforeSubject && afterSubject && afterSubject.x > beforeSubject.x);
    assert.notEqual(beforePlane, afterPlane);
    assert.notEqual(beforeNear, afterNear);
    assert.equal(beforeCone, afterCone);
    assert.equal(await page.getByTestId("far-focus-offscreen").count(), 1);

    const subjectDistanceInches = Number(
      await subject.getAttribute("data-distance-inches")
    );
    const displayedDistance =
      (await page.getByTestId("subject-distance-value").textContent()) ?? "";

    assert.ok(Number.isFinite(subjectDistanceInches));
    assert.match(displayedDistance, /cm$/);

    const displayedCm = Number(displayedDistance.replace("cm", "").trim());

    assert.ok(
      Math.abs(displayedCm - subjectDistanceInches * 2.54) <= 0.2,
      `distance UI and scene disagree: ${displayedDistance} vs ${subjectDistanceInches}in`
    );
  });
});

test("focal length changes FOV and DOF without moving the subject", async () => {
  await withApp({ width: 1448, height: 1086 }, async (page) => {
    const subject = page.getByTestId("scene-subject");
    const focusPlane = page.getByTestId("subject-focus-plane");
    const near = page.getByTestId("near-focus-line");
    const cone = page.getByTestId("fov-cone");

    const beforeSubject = await subject.boundingBox();
    const beforePlane = await focusPlane.getAttribute("x1");
    const beforeNear = await near.getAttribute("x1");
    const beforeCone = await cone.getAttribute("d");

    const focalSlider = page.getByRole("slider", { name: "Focal length" });
    await focalSlider.press("ArrowRight");
    assert.equal(
      await page.getByTestId("focal-length-value").textContent(),
      "48 mm"
    );
    await focalSlider.press("End");

    const afterSubject = await subject.boundingBox();
    const afterPlane = await focusPlane.getAttribute("x1");
    const afterNear = await near.getAttribute("x1");
    const afterCone = await cone.getAttribute("d");

    assert.ok(beforeSubject && afterSubject);
    assert.ok(Math.abs(beforeSubject.x - afterSubject.x) < 0.5);
    assert.equal(beforePlane, afterPlane);
    assert.notEqual(beforeNear, afterNear);
    assert.notEqual(beforeCone, afterCone);
  });
});

test("aperture changes DOF without moving the subject or changing FOV", async () => {
  await withApp({ width: 1448, height: 1086 }, async (page) => {
    const subject = page.getByTestId("scene-subject");
    const near = page.getByTestId("near-focus-line");
    const cone = page.getByTestId("fov-cone");

    const beforeSubject = await subject.boundingBox();
    const beforeNear = await near.getAttribute("x1");
    const beforeCone = await cone.getAttribute("d");

    const apertureSlider = page.getByRole("slider", { name: "Aperture" });
    assert.equal(await page.getByTestId("aperture-value").textContent(), "f/1.8");
    await apertureSlider.press("ArrowRight");
    assert.equal(await page.getByTestId("aperture-value").textContent(), "f/2");
    await apertureSlider.press("End");

    const afterSubject = await subject.boundingBox();
    const afterNear = await near.getAttribute("x1");
    const afterCone = await cone.getAttribute("d");

    assert.ok(beforeSubject && afterSubject);
    assert.ok(Math.abs(beforeSubject.x - afterSubject.x) < 0.5);
    assert.notEqual(beforeNear, afterNear);
    assert.equal(beforeCone, afterCone);
  });
});

test("sensor size changes FOV without moving camera or subject", async () => {
  await withApp({ width: 1448, height: 1086 }, async (page) => {
    const photographer = page.getByTestId("scene-photographer");
    const subject = page.getByTestId("scene-subject");
    const cone = page.getByTestId("fov-cone");
    const near = page.getByTestId("near-focus-line");

    const beforePhotographer = await photographer.boundingBox();
    const beforeSubject = await subject.boundingBox();
    const beforeCone = await cone.getAttribute("d");
    const beforeNear = await near.getAttribute("x1");

    await page.getByLabel("Sensor").selectOption({ label: "APS-C (1.5x)" });

    const afterPhotographer = await photographer.boundingBox();
    const afterSubject = await subject.boundingBox();
    const afterCone = await cone.getAttribute("d");
    const afterNear = await near.getAttribute("x1");

    assert.ok(beforePhotographer && afterPhotographer);
    assert.ok(beforeSubject && afterSubject);
    assert.ok(Math.abs(beforePhotographer.x - afterPhotographer.x) <= 0.5);
    assert.ok(Math.abs(beforeSubject.x - afterSubject.x) <= 0.5);
    assert.notEqual(beforeCone, afterCone);
    assert.notEqual(beforeNear, afterNear);
  });
});

test("unit switching never changes scene geometry", async () => {
  await withApp({ width: 1448, height: 1086 }, async (page) => {
    const subject = page.getByTestId("scene-subject");
    const near = page.getByTestId("near-focus-line");
    const focusPlane = page.getByTestId("subject-focus-plane");
    const cone = page.getByTestId("fov-cone");

    const beforeSubject = await subject.boundingBox();
    const beforeNear = Number(await near.getAttribute("x1"));
    const beforePlane = Number(await focusPlane.getAttribute("x1"));
    const beforeCone = await cone.getAttribute("d");

    await page.getByRole("button", { name: "Imperial" }).click();

    const afterSubject = await subject.boundingBox();
    const afterNear = Number(await near.getAttribute("x1"));
    const afterPlane = Number(await focusPlane.getAttribute("x1"));
    const afterCone = await cone.getAttribute("d");

    assert.ok(beforeSubject && afterSubject);
    assert.ok(Math.abs(beforeSubject.x - afterSubject.x) < 0.25);
    assert.ok(Math.abs(beforeNear - afterNear) < 0.25);
    assert.ok(Math.abs(beforePlane - afterPlane) < 0.25);
    assert.equal(beforeCone, afterCone);
  });
});

test("setting hyperfocal expands the scene and exposes infinity", async () => {
  await withApp({ width: 1448, height: 1086 }, async (page) => {
    await page.getByRole("button", { name: "Set hyperfocal" }).click();
    await assertFocusLabelsContained(page, "hyperfocal");

    const subject = page.getByTestId("scene-subject");
    const focusPlaneX = Number(
      await page.getByTestId("subject-focus-plane").getAttribute("x1")
    );
    const viewBoxWidth = Number(
      (await page.getByTestId("scene-svg").getAttribute("viewBox"))
        ?.split(/\s+/)[2]
    );
    const subjectBox = await subject.boundingBox();
    const sceneBox = await page.getByTestId("scene-frame").boundingBox();
    const farCard = page.locator("article").filter({ hasText: "Far Focus" });
    const settings = page.getByTestId("settings-panel");
    const settingsMetrics = await settings.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    const documentMetrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    assert.ok(subjectBox && sceneBox);
    assert.ok(subjectBox.x >= sceneBox.x && subjectBox.x < sceneBox.x + sceneBox.width);
    assert.ok(
      focusPlaneX < viewBoxWidth - 60,
      `subject focus plane pinned to scene edge: ${focusPlaneX}/${viewBoxWidth}`
    );
    assert.match((await farCard.locator("p").last().textContent()) ?? "", /∞/);
    assert.ok(settingsMetrics.scrollHeight <= settingsMetrics.clientHeight + 1);
    assert.ok(documentMetrics.scrollWidth <= documentMetrics.clientWidth + 1);
    assert.equal(await page.getByTestId("far-focus-offscreen").count(), 1);

    await page.screenshot({
      path: "artifacts/classroom-hyperfocus-light.png",
      fullPage: false,
    });
  });
});
