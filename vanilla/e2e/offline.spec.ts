import { test, expect } from "@playwright/test";

test("production build loads offline via service worker", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  // Load the app and wait for SW registration
  await page.goto("./#/home", { waitUntil: "load" });

  // Ensure service worker is active and ready
  const swState = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return "none";
    const reg = await navigator.serviceWorker.ready;
    return reg.active ? "active" : "inactive";
  });
  expect(swState).toBe("active");

  // Cut network connection
  await context.setOffline(true);

  // Reload the page while offline
  await page.reload({ waitUntil: "load" });

  // Verify the app shell rendered offline
  const wordmark = await page.locator(".wordmark").textContent();
  expect(wordmark).toMatch(/Song/);

  const homeStat = await page.waitForSelector(".stat__name", { timeout: 5000 });
  expect(homeStat).not.toBeNull();

  await context.close();
});
