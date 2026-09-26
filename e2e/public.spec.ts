import { test, expect, gotoOk } from "./fixtures";

test.describe("public site", () => {
  test("homepage: slogan, Buy/Rent paths, city search", async ({ page }) => {
    await gotoOk(page, "/", "Your perfect home is our goal.");
    await expect(page.locator('main a[href="/buy"]').first()).toBeVisible();
    await expect(page.locator('main a[href="/rent"]').first()).toBeVisible();
    const cityOptions = await page.locator("#search-city option").count();
    expect(cityOptions, "homepage city select must not be empty").toBeGreaterThan(0);
  });

  for (const [path, heading] of [
    ["/buy", /Properties for Sale/],
    ["/rent", /Properties for Rent/],
    ["/search", /Search properties/],
    ["/locations", /Locations/],
    ["/contact", /.+/],
  ] as const) {
    test(`${path} renders without errors`, async ({ page }) => {
      await gotoOk(page, path, heading);
    });
  }

  test("unknown URL is a real 404, not a 500", async ({ page, watch }) => {
    watch.allowStatuses.push(404);
    const res = await page.goto("/definitely-not-a-page");
    expect(res?.status()).toBe(404);
  });

  test("/buy and /rent keep their transaction type against URL tampering", async ({ page }) => {
    const badges = (t: string) => page.locator("span", { hasText: new RegExp(`^${t}$`) }).count();
    await gotoOk(page, "/buy?type=RENT&listingType=RENT");
    expect(await badges("For Rent")).toBe(0);
    await gotoOk(page, "/rent?type=SALE&listingType=SALE");
    expect(await badges("For Sale")).toBe(0);
  });

  test("header city menu, footer and /locations are database-driven", async ({ page }) => {
    await gotoOk(page, "/locations");
    const cityLinks = page.locator('main a[href^="/"]:not([href="/contact"])');
    expect(await cityLinks.count(), "/locations lists at least one city with listings").toBeGreaterThan(0);
    const firstHref = await cityLinks.first().getAttribute("href");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: /Cities|^[A-Z]/ }).filter({ has: page.locator("svg") }).first().click();
    await expect(page.getByRole("link", { name: "All locations" }).first()).toBeVisible();
    await page.keyboard.press("Escape");

    await page.locator("footer").getByRole("link").first().waitFor();
    await page.goto(firstHref!);
    await expect(page.locator("h1").first()).not.toHaveText(/Something went wrong/i);
  });

  test("cities without listings render an empty state (not a 500)", async ({ page }) => {
    for (const slug of ["mumbai", "varanasi", "bengaluru", "delhi"]) {
      const res = await page.goto(`/${slug}`, { waitUntil: "domcontentloaded" });
      // 200 when the pan-India locations are seeded; 404 is acceptable on a DB that hasn't been seeded yet — never 5xx.
      expect([200, 404], `/${slug}`).toContain(res?.status());
    }
  });

  test("search filter sheet: city → dependent locality, results stay scoped", async ({ page }) => {
    await gotoOk(page, "/search");
    // the button can be clicked before hydration attaches its handler — retry until the sheet is really open
    await expect(async () => {
      await page.getByRole("button", { name: "More filters" }).click();
      await expect(page.locator("dialog[open]")).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    const citySelect = page.locator('dialog select[aria-label="City"]');
    const options = await citySelect.locator("option").count();
    expect(options, "city filter has at least one city besides 'Any city'").toBeGreaterThan(1);
    await citySelect.selectOption({ index: 1 });
    const locality = page.locator('dialog select[aria-label="Locality"]');
    await expect(locality).toBeVisible();
    await expect(locality.locator("option")).not.toHaveCount(1); // "Any locality" + real localities once loaded
    await locality.selectOption({ index: 1 });
    await page.locator("dialog").getByRole("button", { name: /Show \d+ home/ }).click();
    await expect(page).toHaveURL(/city=.+locality=|locality=.+city=/);
    await expect(page.locator("h1").first()).not.toHaveText(/Something went wrong/i);
  });

  test("location API rejects bad input and serves valid lookups", async ({ request }) => {
    expect((await request.get("/api/locations?level=localities&parent=../etc")).status()).toBe(400);
    expect((await request.get("/api/locations?level=bogus&parent=abc")).status()).toBe(400);
    const ok = await request.get("/api/locations?level=localities&parent=doesnotexist");
    expect(ok.status()).toBe(200);
    expect((await ok.json()).items).toEqual([]);
  });

  test("search accepts every location level without erroring", async ({ request }) => {
    for (const q of ["state=abc", "country=abc", "neighbourhood=abc", "city=abc&locality=abc", "state=%27%3Bdrop"]) {
      expect((await request.get(`/api/search?${q}`)).status(), q).toBe(200);
    }
  });
});
