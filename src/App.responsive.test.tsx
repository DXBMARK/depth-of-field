import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

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

test("reference desktop fits without document or settings-panel scrolling", async () => {
  const port = await getOpenPort();
  const { server, appUrl } = await startVite(port);

  try {
    const browser = await chromium.launch({
      headless: true,
      ...(existsSync(localChromePath) ? { executablePath: localChromePath } : {}),
    });

    const page = await browser.newPage({ viewport: { width: 1448, height: 1086 } });
    await page.goto(appUrl, { waitUntil: "networkidle" });

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

    await browser.close();
  } finally {
    server.kill();
    await once(server, "exit").catch(() => undefined);
  }
});
