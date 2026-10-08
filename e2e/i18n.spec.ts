import { test, expect, gotoOk, adminLogin, HAS_ADMIN } from "./fixtures";

/** A conservative set of dictionary-key fragments that would only ever
 * appear in the rendered page if a translation lookup failed and fell back
 * to the raw key — i.e. proof of a missing/broken translation. */
const KEY_LEAK_PATTERNS = [/home\.hero/, /nav\.buy/, /search\.filters/, /propertyDetail\./, /property\.forSale/];

test.describe("i18n: English/Hindi", () => {
  test("1. English homepage loads", async ({ page }) => {
    await gotoOk(page, "/", "Your perfect home is our goal.");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("2. Hindi homepage loads (?hl=hi forces it, no URL prefix)", async ({ page }) => {
    const res = await page.goto("/?hl=hi", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await expect(page.locator("h1").first()).toHaveText("आपका सपनों का घर, हमारा लक्ष्य है।");
  });

  test("3. Language selector appears on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoOk(page, "/");
    await expect(page.getByRole("button", { name: "Select language" })).toBeVisible();
  });

  test("4. Language selector appears on mobile, inside the nav sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoOk(page, "/");
    // No separate language bar before opening the menu.
    await expect(page.getByText("हिन्दी", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("button", { name: "English" })).toBeVisible();
    await expect(page.getByRole("button", { name: "हिन्दी", exact: true })).toBeVisible();
  });

  test("5. English → Hindi switch works, 6. Hindi → English switch works, 9. current page is preserved", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoOk(page, "/");
    const urlBefore = page.url();

    await page.getByRole("button", { name: "Select language" }).click();
    await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
    await expect(page.locator("h1").first()).toHaveText("आपका सपनों का घर, हमारा लक्ष्य है।", { timeout: 10_000 });
    expect(page.url()).toBe(urlBefore); // switching language never navigates

    await page.getByRole("button", { name: "भाषा चुनें" }).click();
    await page.getByRole("button", { name: "English", exact: true }).click();
    await expect(page.locator("h1").first()).toHaveText("Your perfect home is our goal.", { timeout: 10_000 });
    expect(page.url()).toBe(urlBefore);
  });

  test("7. Language persists after refresh, 8. persists across navigation", async ({ page, baseURL }) => {
    await page.goto("/"); // establish an origin before addCookies can target it
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: "hi", url: baseURL ?? "http://localhost:3000" }]);
    await gotoOk(page, "/");
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");

    await page.goto("/buy");
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await expect(page.locator("h1").first()).toHaveText("बिक्री के लिए संपत्तियाँ");
  });

  test("10. Search params are preserved across a language switch", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoOk(page, "/buy?minPrice=500000&bedrooms=2");
    const before = page.url();
    await page.getByRole("button", { name: "Select language" }).click();
    await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
    await expect(page.locator("h1").first()).toHaveText("बिक्री के लिए संपत्तियाँ", { timeout: 10_000 });
    expect(page.url()).toBe(before);
    expect(page.url()).toContain("minPrice=500000");
    expect(page.url()).toContain("bedrooms=2");
  });

  test("11. Buy works in English and Hindi", async ({ page }) => {
    await gotoOk(page, "/buy", "Properties for Sale");
    await gotoOk(page, "/buy?hl=hi", "बिक्री के लिए संपत्तियाँ");
  });

  test("12. Rent works in English and Hindi", async ({ page }) => {
    await gotoOk(page, "/rent", "Properties for Rent");
    await gotoOk(page, "/rent?hl=hi", "किराये की संपत्तियाँ");
  });

  test("13/14. City and locality selection work with the UI translated (Hindi)", async ({ page }) => {
    await gotoOk(page, "/search?hl=hi");
    await expect(async () => {
      await page.getByRole("button", { name: "अधिक फ़िल्टर" }).click();
      await expect(page.locator("dialog[open]")).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    const citySelect = page.locator('dialog select[aria-label="शहर"]');
    const cityOptionCount = await citySelect.locator("option").count();
    expect(cityOptionCount, "city filter has at least one real city").toBeGreaterThan(1);
    await citySelect.selectOption({ index: 1 });

    const localitySelect = page.locator('dialog select[aria-label="इलाका"]');
    await expect(localitySelect).toBeVisible();
    await expect(localitySelect.locator("option")).not.toHaveCount(1);
    await localitySelect.selectOption({ index: 1 });

    await page.locator("dialog").getByRole("button", { name: /घर दिखाएँ/ }).click();
    await expect(page).toHaveURL(/city=.+locality=|locality=.+city=/);
  });

  test("16. Property detail works in Hindi", async ({ page }) => {
    await gotoOk(page, "/search?hl=hi");
    const firstCard = page.locator('main a[href^="/properties/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await expect(page.getByText("इस घर के बारे में")).toBeVisible();
  });

  test("17. Property enquiry works in Hindi", async ({ page }) => {
    await gotoOk(page, "/search?hl=hi");
    const firstCard = page.locator('main a[href^="/properties/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    // Desktop sticky rail and mobile sticky bar both render in the DOM (CSS
    // toggles visibility per breakpoint) — click the one actually visible.
    await page.getByRole("button", { name: "पूछताछ करें" }).first().click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    await dialog.locator("#enquiry-name").fill("टेस्ट उपयोगकर्ता");
    await dialog.locator("#enquiry-phone").fill("9999999999");
    // Not submitted — this is a read-only UI check, no lead should be created by the i18n suite.
    await expect(dialog.getByRole("button", { name: "पूछताछ भेजें" })).toBeEnabled();
  });

  test("18. No missing/leaked translation keys on key pages", async ({ page }) => {
    for (const path of ["/?hl=hi", "/buy?hl=hi", "/rent?hl=hi", "/search?hl=hi", "/locations?hl=hi", "/contact?hl=hi"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      const body = await page.locator("body").innerText();
      for (const pattern of KEY_LEAK_PATTERNS) {
        expect(body, `${path} leaked a raw translation key matching ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  test("21. No broken nav links in Hindi", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoOk(page, "/?hl=hi");
    for (const href of ["/buy", "/rent", "/search", "/locations", "/contact"]) {
      const res = await page.goto(href);
      expect(res?.status(), href).toBeLessThan(400);
    }
  });

  test("hreflang alternates are present and point at distinct, crawlable URLs", async ({ page }) => {
    await gotoOk(page, "/");
    const en = page.locator('link[rel="alternate"][hreflang="en"]');
    const hi = page.locator('link[rel="alternate"][hreflang="hi"]');
    const xDefault = page.locator('link[rel="alternate"][hreflang="x-default"]');
    await expect(en).toHaveCount(1);
    await expect(hi).toHaveCount(1);
    await expect(xDefault).toHaveCount(1);
    expect(await en.getAttribute("href")).toContain("hl=en");
    expect(await hi.getAttribute("href")).toContain("hl=hi");
  });

  test("sitemap carries hreflang alternates", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('hreflang="hi"');
    expect(body).toContain('hreflang="x-default"');
  });

  test("22/23. Admin stays English-only even with a Hindi cookie, and login still works", async ({ page }) => {
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: "hi", url: "http://localhost:3000" }]);
    await page.goto("/admin/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toHaveText(/Admin sign in/);

    test.skip(!HAS_ADMIN, "set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for the authenticated half of this test");
    await adminLogin(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.goto("/admin/properties");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
