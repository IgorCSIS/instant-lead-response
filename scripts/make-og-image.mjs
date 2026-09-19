/*
 * Rasterize assets/og-image.html into assets/og-image.png.
 *
 * Run this by hand when the card changes:
 *
 *   node scripts/make-og-image.mjs
 *
 * It needs a Chromium and is deliberately not wired into the deploy
 * workflow. The PNG is committed, so shipping the site needs neither this
 * script nor a browser.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(ROOT, "assets/og-image.html");
const TARGET = resolve(ROOT, "assets/og-image.png");

// Open Graph consumers expect exactly this. A card that is not 1200x630
// gets cropped differently by every one of them.
const WIDTH = 1200;
const HEIGHT = 630;

// playwright-core is the smaller of the two and is what this only ever
// needs, but a machine that already has the full playwright should not have
// to install a second copy to regenerate one PNG.
const { chromium } = await import("playwright-core").catch(() => import("playwright"));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});
await page.goto("file://" + SOURCE, { waitUntil: "networkidle" });
await page.screenshot({ path: TARGET, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
await browser.close();

console.log(`Wrote ${TARGET} at ${WIDTH}x${HEIGHT}`);
