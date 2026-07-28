import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];

const ROUTES = [
  { name: "home", hash: "#/home", wait: ".stat__value" },
  { name: "library", hash: "#/library", wait: ".songrow" },
  { name: "song", hash: "#/song/seed-song-1", wait: ".sheet__chords" },
  { name: "instruments", hash: "#/instruments", wait: ".row__name" },
  { name: "settings", hash: "#/settings", wait: ".card__title" },
];

for (const viewport of VIEWPORTS) {
  test.describe(`Route checks (${viewport.name})`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
    });

    for (const route of ROUTES) {
      test(`renders ${route.name}`, async ({ page }) => {
        await page.goto(`./${route.hash}`, { waitUntil: "load" });
        await page.waitForSelector(route.wait, { timeout: 8000 });
        expect(await page.locator(route.wait).count()).toBeGreaterThan(0);
      });
    }
  });
}
