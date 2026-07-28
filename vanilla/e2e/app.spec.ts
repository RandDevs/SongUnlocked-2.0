import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.describe.serial("SongUnlocked 35 interaction checks", () => {
  let context: BrowserContext;
  let page: Page;
  const problems: string[] = [];

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 420, height: 900 },
    });
    page = await context.newPage();

    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`console: ${message.text()}`);
    });

    await page.goto("./#/home", { waitUntil: "load" });
    await page.waitForSelector(".stat__value");
  });

  test.afterAll(async () => {
    await context?.close();
    expect(problems, `Browser errors detected: ${problems.join("; ")}`).toEqual([]);
  });

  async function go(hash: string) {
    await page.evaluate((target) => {
      if (location.hash === target) location.reload();
      else location.hash = target;
    }, hash);
    await page.waitForTimeout(250);
  }

  async function pickOption(triggerId: string, label: string) {
    await page.locator(`#${triggerId}`).click();
    await page.waitForTimeout(120);
    await page
      .locator(`#${triggerId}-list [role="option"]`)
      .filter({ hasText: new RegExp(`^${label}$`) })
      .click();
    await page.waitForTimeout(180);
  }

  test("1. seed library loads six songs", async () => {
    await go("#/library");
    await page.waitForSelector(".songrow");
    const rows = await page.locator(".songrow").count();
    expect(rows).toBe(6);
  });

  test("2. search filters and never loses focus", async () => {
    const input = page.locator("#library-search");
    await input.click();

    for (const letter of "wonder") {
      await page.keyboard.type(letter, { delay: 40 });
      const stillFocused = await page.evaluate(
        () => document.activeElement?.id === "library-search",
      );
      expect(stillFocused).toBe(true);
    }

    await page.waitForTimeout(150);
    const rows = await page.locator(".songrow").count();
    expect(rows).toBe(1);

    const caret = await page.evaluate(() => {
      const element = document.getElementById("library-search") as HTMLInputElement;
      return element.selectionStart;
    });
    expect(caret).toBe(6);
  });

  test("3. status filter narrows results", async () => {
    await go("#/library");
    await page.waitForSelector(".songrow");
    await pickOption("filter-status", "To Learn");
    const rows = await page.locator(".songrow").count();
    expect(rows).toBe(3);

    await pickOption("filter-status", "Any status");
    const restored = await page.locator(".songrow").count();
    expect(restored).toBe(6);
  });

  test("4. an active filter dropdown says so, a resting one does not", async () => {
    await go("#/library");
    await page.waitForSelector(".songrow");

    const resting = await page
      .locator('.pick__trigger[data-active="true"]')
      .count();
    expect(resting).toBe(0);

    await pickOption("filter-status", "Mastered");
    const active = await page.getAttribute("#filter-status", "data-active");
    expect(active).toBe("true");

    const colour = await page.evaluate(
      () => getComputedStyle(document.querySelector("#filter-status")!).color,
    );
    expect(colour).toBe("rgb(116, 216, 180)");

    await page.locator("#clear-filters").click();
    await page.waitForTimeout(180);
  });

  test("5. no native select survives anywhere in the app", async () => {
    let native = 0;
    for (const hash of ["#/home", "#/library", "#/instruments", "#/settings"]) {
      await go(hash);
      native += await page.locator("select").count();
    }

    await go("#/library");
    await page.getByRole("button", { name: "New song" }).click();
    await page.waitForSelector("dialog.sheetdialog");
    native += await page.locator("dialog select").count();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    expect(native).toBe(0);
  });

  test("6. the custom dropdown works from the keyboard alone", async () => {
    await go("#/home");
    await page.waitForSelector("#quick-instrument");

    const before = await page.locator("#quick-instrument").textContent();
    await page.locator("#quick-instrument").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(120);

    const expanded = await page.getAttribute(
      "#quick-instrument",
      "aria-expanded",
    );
    expect(expanded).toBe("true");

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(120);

    const after = await page.locator("#quick-instrument").textContent();
    expect(after).not.toBe(before);

    const closed = await page.getAttribute("#quick-instrument", "aria-expanded");
    expect(closed).toBe("false");

    const focused = await page.evaluate(
      () => document.activeElement?.id === "quick-instrument",
    );
    expect(focused).toBe(true);

    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    const dismissed = await page.getAttribute(
      "#quick-instrument",
      "aria-expanded",
    );
    expect(dismissed).toBe("false");
  });

  test("7. Escape inside a dropdown does not close the dialog", async () => {
    await go("#/library");
    await page.getByRole("button", { name: "New song" }).click();
    await page.waitForSelector("dialog.sheetdialog");

    await page.locator("#song-capo").click();
    await page.waitForTimeout(120);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    const stillOpen = await page.evaluate(() =>
      document.querySelector("dialog.sheetdialog")?.hasAttribute("open"),
    );
    expect(stillOpen).toBe(true);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  });

  test("8. capo filter narrows to one position", async () => {
    await go("#/library");
    await page.waitForSelector(".songrow");
    await pickOption("filter-capo", "Capo 2");

    const rows = await page.locator(".songrow").count();
    expect(rows).toBe(2);

    const badges = await page.locator(".capotag").count();
    expect(badges).toBe(2);

    await page.locator("#clear-filters").click();
    await page.waitForTimeout(150);
    const cleared = await page.locator(".songrow").count();
    expect(cleared).toBe(6);
  });

  test("9. two mood tags widen the result instead of narrowing it", async () => {
    await page.getByRole("button", { name: "Sad", exact: true }).click();
    await page.waitForTimeout(150);
    const one = await page.locator(".songrow").count();
    expect(one).toBe(2);

    await page.getByRole("button", { name: "Love", exact: true }).click();
    await page.waitForTimeout(150);
    const two = await page.locator(".songrow").count();
    expect(two).toBe(3);
  });

  test("10. filters are still set after a reload", async () => {
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector(".songrow");
    await page.waitForTimeout(200);

    const rows = await page.locator(".songrow").count();
    expect(rows).toBe(3);

    const pressed = await page
      .locator('.moodrow .moodchip[aria-pressed="true"]')
      .allTextContents();
    expect(pressed.length).toBe(2);

    await page.locator("#clear-filters").click();
    await page.waitForTimeout(150);
    const cleared = await page.locator(".songrow").count();
    expect(cleared).toBe(6);
  });

  test("11. a delete button turns red before it is pressed", async () => {
    await go("#/song/seed-song-1");
    await page.waitForSelector('button[aria-label="Delete song"]');

    await page.hover('button[aria-label="Delete song"]');
    await page.waitForTimeout(200);

    const hovered = await page.evaluate(() => {
      const button = document.querySelector('button[aria-label="Delete song"]');
      if (!button) return { color: "", background: "" };
      const style = getComputedStyle(button);
      return { color: style.color, background: style.backgroundColor };
    });

    expect(hovered.color).toBe("rgb(255, 111, 94)");
    expect(hovered.background).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("12. deleting a song still asks first", async () => {
    await page.click('button[aria-label="Delete song"]');
    await page.waitForSelector("dialog.sheetdialog");

    const label = await page.locator("dialog .sheetdialog__title").textContent();
    expect(label).toMatch(/Delete song/i);

    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(200);

    await go("#/library");
    await page.waitForSelector(".songrow");
    const rows = await page.locator(".songrow").count();
    expect(rows).toBe(6);
  });

  test("13. quick add saves and keeps the cursor in the field", async () => {
    await go("#/home");
    await page.waitForSelector("#quick-title");
    await page.fill("#quick-title", "Blackbird");
    await page.click('.quickadd button[type="submit"]');
    await page.waitForSelector(".toast");

    const toast = await page.locator(".toast").first().textContent();
    expect(toast).toMatch(/Blackbird/);

    const value = await page.inputValue("#quick-title");
    expect(value).toBe("");

    const focused = await page.evaluate(
      () => document.activeElement?.id === "quick-title",
    );
    expect(focused).toBe(true);
  });

  test("14. the new song survives a full reload", async () => {
    await page.goto("./#/library", { waitUntil: "load" });
    await page.waitForSelector(".songrow");
    const rows = await page.locator(".songrow").count();
    expect(rows).toBe(7);
    const text = await page.locator(".songlist").textContent();
    expect(text).toMatch(/Blackbird/);
  });

  test("15. empty titles are refused without closing the dialog", async () => {
    await page.getByRole("button", { name: "New song" }).click();
    await page.waitForSelector("dialog.sheetdialog");
    await page.getByRole("button", { name: "Save song" }).click();
    await page.waitForTimeout(250);

    const open = await page.evaluate(() =>
      document.querySelector("dialog.sheetdialog")?.hasAttribute("open"),
    );
    expect(open).toBe(true);

    const errors = await page.locator(".toast--error").count();
    expect(errors).toBeGreaterThan(0);

    await page.keyboard.press("Escape");
  });

  test("16. autoscroll moves the page, then stops on pause", async () => {
    await page.goto("./#/song/seed-song-1", { waitUntil: "load" });
    await page.waitForSelector(".transport__play");

    const before = await page.evaluate(() => window.scrollY);
    await page.click(".transport__play");
    await page.waitForTimeout(1200);
    const during = await page.evaluate(() => window.scrollY);
    expect(during).toBeGreaterThan(before);

    await page.click(".transport__play");
    const afterPause = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(600);
    const settled = await page.evaluate(() => window.scrollY);
    expect(Math.abs(settled - afterPause)).toBeLessThanOrEqual(1);
  });

  test("17. autoscroll stops when leaving the song", async () => {
    await page.click(".transport__play");
    await page.waitForTimeout(400);
    await go("#/library");
    await page.waitForSelector(".songrow");
    const a = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(700);
    const b = await page.evaluate(() => window.scrollY);
    expect(Math.abs(b - a)).toBeLessThanOrEqual(1);
  });

  test("18. chord lines are tinted and lyrics are not", async () => {
    await page.goto("./#/song/seed-song-1", { waitUntil: "load" });
    await page.waitForSelector(".sheet__chords");
    const chords = await page.locator(".sheet__chords").count();
    expect(chords).toBeGreaterThanOrEqual(6);

    const colour = await page.evaluate(() => {
      const element = document.querySelector(".sheet__chords");
      return element ? getComputedStyle(element).color : "";
    });
    expect(colour).toBe("rgb(116, 216, 180)");
  });

  test("19. chord alignment is preserved character for character", async () => {
    const line = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll(".sheet__chords")];
      const match = nodes.find((node) => node.textContent?.includes("Dsus4"));
      return match?.textContent?.replace(/\n$/, "") || "";
    });
    expect(line).toContain("Dsus4");
    expect(/Dsus4 {2,}A7sus4/.test(line)).toBe(true);
  });

  test("20. mastering is one tap, and demoting is not offered", async () => {
    await go("#/song/seed-song-4");
    await page.waitForSelector(".badge");

    await page.getByRole("button", { name: "Mark as Mastered" }).click();
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector(".badge");

    const badge = await page.locator(".badge").first().textContent();
    expect(badge).toMatch(/Mastered/i);

    const toLearn = await page
      .getByRole("button", { name: /Mark as To Learn/i })
      .count();
    expect(toLearn).toBe(0);

    const promote = await page
      .getByRole("button", { name: /Mark as Mastered/i })
      .count();
    expect(promote).toBe(0);

    await page.getByRole("button", { name: "Edit song" }).click();
    await page.waitForSelector("dialog.sheetdialog");
    await pickOption("song-status", "To Learn");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForTimeout(400);
  });

  test("20b. autoscroll continues when marking song mastered", async () => {
    await go("#/song/seed-song-5");
    await page.waitForSelector(".transport__play");
    await page.locator(".transport__play").click();
    await page.waitForTimeout(300);

    const a = await page.evaluate(() => window.scrollY);
    await page.getByRole("button", { name: "Mark as Mastered" }).click();
    await page.waitForTimeout(700);

    const b = await page.evaluate(() => window.scrollY);
    expect(b).toBeGreaterThan(a + 2);

    await page.locator(".transport__play").click();

    // Restore state so subsequent tests inherit untouched library state
    await page.getByRole("button", { name: "Edit song" }).click();
    await page.waitForSelector("dialog.sheetdialog");
    await pickOption("song-status", "To Learn");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForTimeout(400);
  });

  test("21. the chord list has its own labelled line", async () => {
    await go("#/song/seed-song-1");
    await page.waitForSelector(".songhead__chords");

    const label = await page.locator(".songhead__chordlabel").textContent();
    expect(label).toMatch(/chords/i);

    const list = await page.locator(".songhead__chordlist").textContent();
    expect((list || "").trim().length).toBeGreaterThan(0);

    const below = await page.evaluate(() => {
      const facts = document.querySelector(".songhead__facts");
      const chords = document.querySelector(".songhead__chords");
      if (!facts || !chords) return false;
      return Boolean(
        facts.compareDocumentPosition(chords) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    expect(below).toBe(true);
  });

  test("22. edit and delete sit together in the header corner", async () => {
    const tools = await page.locator(".songhead__tools button").count();
    expect(tools).toBe(2);

    const rightAligned = await page.evaluate(() => {
      const tools = document.querySelector(".songhead__tools");
      const title = document.querySelector(".songhead__title");
      if (!tools || !title) return false;
      return (
        tools.getBoundingClientRect().left > title.getBoundingClientRect().left
      );
    });
    expect(rightAligned).toBe(true);
  });

  test("23. the back link is readable, not a footnote", async () => {
    const size = await page.evaluate(() => {
      const link = document.querySelector(".backlink");
      return link ? parseFloat(getComputedStyle(link).fontSize) : 0;
    });
    expect(size).toBeGreaterThanOrEqual(15);
  });

  test("24. moods carry their own icon and hue", async () => {
    await go("#/library");
    await page.waitForSelector(".moodchip");

    const chips = await page.evaluate(() =>
      [...document.querySelectorAll(".moodrow .moodchip")].map((chip) => ({
        mood: chip.getAttribute("data-mood"),
        icons: chip.querySelectorAll("svg").length,
        hue: getComputedStyle(chip.querySelector("svg") || chip).color,
      })),
    );

    expect(chips.length).toBeGreaterThan(0);
    expect(chips.every((chip) => chip.icons === 1)).toBe(true);

    const hues = new Set(chips.map((chip) => chip.hue));
    expect(hues.size).toBeGreaterThanOrEqual(3);
    expect(hues.has("rgb(116, 216, 180)")).toBe(false);
  });

  test("25. the dialog keeps Save in view without scrolling", async () => {
    await go("#/library");
    await page.getByRole("button", { name: "New song" }).click();
    await page.waitForSelector("dialog.sheetdialog");

    const before = await page.evaluate(() => {
      const button = [...document.querySelectorAll("dialog button")].find(
        (node) => node.textContent?.trim() === "Save song",
      );
      const body = document.querySelector(".sheetdialog__body");
      if (!button || !body) return null;
      return {
        top: button.getBoundingClientRect().top,
        scrollable: body.scrollHeight > body.clientHeight + 1,
      };
    });
    expect(before).not.toBeNull();
    expect(before!.scrollable).toBe(true);

    await page.evaluate(() => {
      const body = document.querySelector(".sheetdialog__body");
      if (body) body.scrollTop = body.scrollHeight;
    });
    await page.waitForTimeout(150);

    const after = await page.evaluate(() => {
      const button = [...document.querySelectorAll("dialog button")].find(
        (node) => node.textContent?.trim() === "Save song",
      );
      return button ? button.getBoundingClientRect().top : -1;
    });
    expect(Math.abs(after - before!.top)).toBeLessThan(2);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  });

  test("26. no primary button hovers back to the old lime", async () => {
    await go("#/library");
    await page.getByRole("button", { name: "New song" }).hover();
    await page.waitForTimeout(200);

    const colour = await page.evaluate(() => {
      const node = document.querySelector(".btn--primary");
      return node ? getComputedStyle(node).backgroundColor : "";
    });
    expect(colour).toBe("rgb(143, 227, 196)");
  });

  test("27. the background carries texture without an image request", async () => {
    const layers = await page.evaluate(() => {
      const before = getComputedStyle(document.documentElement, "::before");
      const after = getComputedStyle(document.documentElement, "::after");
      return {
        grain: before.backgroundImage,
        opacity: parseFloat(before.opacity),
        vignette: after.backgroundImage,
      };
    });

    expect(layers.grain).toContain("data:image/svg+xml");
    expect(layers.opacity).toBeGreaterThan(0);
    expect(layers.opacity).toBeLessThanOrEqual(0.05);
    expect(layers.vignette).toContain("radial-gradient");
  });

  test("28. type size control changes the sheet font size", async () => {
    await go("#/song/seed-song-1");
    await page.waitForSelector(".sheet");
    const before = await page.evaluate(
      () => getComputedStyle(document.querySelector(".sheet")!).fontSize,
    );
    await page.getByRole("button", { name: "Larger text" }).click();
    await page.waitForTimeout(120);
    const after = await page.evaluate(
      () => getComputedStyle(document.querySelector(".sheet")!).fontSize,
    );
    expect(parseFloat(after)).toBeGreaterThan(parseFloat(before));
    await page.getByRole("button", { name: "Smaller text" }).click();
  });

  test("29. instruments holding songs cannot be deleted", async () => {
    await go("#/instruments");
    await page.waitForSelector(".row__name");
    const deleteButtons = await page
      .getByRole("button", { name: /^Delete / })
      .count();
    expect(deleteButtons).toBe(0);
  });

  test("30. an empty instrument can be added, renamed and deleted", async () => {
    await page.fill("#instrument-name", "Mandolin");
    await page.click('.quickadd button[type="submit"]');
    await page.waitForTimeout(300);

    let rows = await page.locator(".row__name").allTextContents();
    expect(rows).toContain("Mandolin");

    await page.getByRole("button", { name: "Rename Mandolin" }).click();
    await page.waitForSelector("dialog.sheetdialog");
    await page.fill("dialog.sheetdialog input", "Banjo");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForTimeout(300);

    rows = await page.locator(".row__name").allTextContents();
    expect(rows).toContain("Banjo");

    await page.getByRole("button", { name: "Delete Banjo" }).click();
    await page.waitForSelector("dialog.sheetdialog");
    await page
      .getByRole("button", { name: "Delete instrument", exact: true })
      .click();
    await page.waitForTimeout(300);

    rows = await page.locator(".row__name").allTextContents();
    expect(rows).not.toContain("Banjo");
  });

  test("31. duplicate instrument names are rejected", async () => {
    await page.fill("#instrument-name", "guitar");
    await page.click('.quickadd button[type="submit"]');
    await page.waitForSelector(".toast--error");
    const toast = await page.locator(".toast--error").first().textContent();
    expect(toast).toMatch(/already in your list/i);
  });

  test("32. export produces a valid, complete backup file", async () => {
    await go("#/settings");
    await page.waitForSelector(".card__title");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export backup" }).click(),
    ]);

    const path = await download.path();
    const parsed = JSON.parse(await readFile(path, "utf8"));

    expect(parsed.version).toBe(2);
    expect(
      parsed.songs.every(
        (song: { capo: unknown; tags: unknown }) =>
          typeof song.capo === "number" && Array.isArray(song.tags),
      ),
    ).toBe(true);
    expect(parsed.songs.length).toBe(7);
    expect(parsed.instruments.length).toBe(2);
    expect(download.suggestedFilename()).toMatch(
      /^songunlocked-\d{4}-\d{2}-\d{2}\.json$/,
    );
  });

  test("33. the service worker registers and caches the shell", async () => {
    await page.goto("./#/home", { waitUntil: "load" });
    const ready = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return "unsupported";
      const registration = await navigator.serviceWorker.ready;
      return registration.active ? "active" : "inactive";
    });
    expect(ready).toBe("active");

    const cacheDetails = await page.evaluate(async () => {
      const keys = await caches.keys();
      if (!keys.length) return { count: 0, hasHtml: false, hasJs: false, hasCss: false };
      const cache = await caches.open(keys[0]);
      const requests = await cache.keys();
      const urls = requests.map((r) => r.url);
      return {
        count: urls.length,
        hasHtml: urls.some((u) => u.includes("index.html")),
        hasJs: urls.some((u) => /\/assets\/index-.*\.js/.test(u)),
        hasCss: urls.some((u) => /\/assets\/index-.*\.css/.test(u)),
      };
    });
    expect(cacheDetails.hasHtml).toBe(true);
    expect(cacheDetails.hasJs).toBe(true);
    expect(cacheDetails.hasCss).toBe(true);
    expect(cacheDetails.count).toBeGreaterThanOrEqual(8);
  });

  test("34. an unknown route shows a recovery screen, not a blank page", async () => {
    await page.goto("./#/nonsense", { waitUntil: "load" });
    await page.waitForSelector(".empty__title");
    const text = await page.locator(".empty__title").textContent();
    expect(text).toMatch(/Nothing here/);
  });

  test("35. a deleted song's URL degrades gracefully", async () => {
    await page.goto("./#/song/does-not-exist", { waitUntil: "load" });
    await page.waitForSelector(".empty__title");
    const text = await page.locator(".empty__title").textContent();
    expect(text).toMatch(/Song not found/);
  });
});
