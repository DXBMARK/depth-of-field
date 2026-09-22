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

test("reference desktop fits without document or settings-panel scrolling", async () => {
  await withApp({ width: 1448, height: 1086 }, async (page) => {
    const documentMetrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    assert.ok(
      documentMetrics.scrollHeight <= documentMetrics.clientHeight + 1,
      `desktop page scrolls vertically: ${JSON.stringify(documentMetrics)}`
    );
    assert.ok(
      documentMetrics.scrollWidth <= documentMetrics.clientWidth + 1,
      `desktop page scrolls horizontally: ${JSON.stringify(documentMetrics)}`
    );

    const settings = page.getByTestId("settings-panel");
    const settingsMetrics = await settings.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));

    assert.ok(
      settingsMetrics.scrollHeight <= settingsMetrics.clientHeight + 1,
      `settings panel scrolls internally: ${JSON.stringify(settingsMetrics)}`
    );

    const simulatorBox = await page.getByTestId("simulator-card").boundingBox();
    const settingsBox = await settings.boundingBox();
    const footerBox = await page.getByTestId("app-footer").boundingBox();

    assert.ok(simulatorBox && settingsBox && footerBox, "expected layout boxes to exist");
    assert.ok(Math.abs(simulatorBox.y - settingsBox.y) <= 3, "main columns should align at the top");
    assert.ok(footerBox.y + footerBox.height <= 1086 + 1, "footer should remain inside the reference viewport");

    await page.screenshot({
      path: "artifacts/dof-1448x1086.png",
      fullPage: false,
    });
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

    await page.getByLabel("Sensor").selectOption({ label: "APS-C" });

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

    const subject = page.getByTestId("scene-subject");
    const focusPlaneX = Number(
      await page.getByTestId("subject-focus-plane").getAttribute("x1")
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
    assert.ok(focusPlaneX < 940, `subject focus plane pinned to scene edge: ${focusPlaneX}`);
    assert.match((await farCard.locator("p").last().textContent()) ?? "", /∞/);
    assert.ok(settingsMetrics.scrollHeight <= settingsMetrics.clientHeight + 1);
    assert.ok(documentMetrics.scrollWidth <= documentMetrics.clientWidth + 1);
    assert.equal(await page.getByTestId("far-focus-offscreen").count(), 1);
  });
});
