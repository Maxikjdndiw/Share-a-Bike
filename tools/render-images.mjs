// Renders the social preview image and the iOS home-screen icon with the
// pre-installed / locally installed Playwright Chromium.
// Usage (from the bikeshare-website folder):  node tools/render-images.mjs
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
const { chromium } = createRequire(import.meta.url)("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const img = path.join(here, "..", "site", "img");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto("file://" + path.join(here, "og-image.html"));
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(img, "og-image.png") });

await page.setViewportSize({ width: 180, height: 180 });
const fs = await import("fs");
const svg = fs.readFileSync(path.join(img, "favicon.svg"), "utf8");
await page.setContent(`<body style="margin:0;background:#FFFFFF;width:180px;height:180px">
  <div style="width:180px;height:180px;transform:scale(1)">${svg.replace("<svg ", '<svg width="180" height="180" ')}</div></body>`);
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(img, "apple-touch-icon.png") });
await browser.close();
console.log("Wrote site/img/og-image.png and site/img/apple-touch-icon.png");
