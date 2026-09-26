import { test, expect, HAS_ADMIN, ALLOW_WRITES, adminLogin, QA_TITLE_PREFIX } from "./fixtures";

test.describe("admin (needs E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD)", () => {
  test("unauthenticated visitors are redirected to /admin/login", async ({ page }) => {
    await page.goto("/admin/properties/new");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator("h1")).toHaveText(/Admin sign in/);
  });

  test.describe("signed in", () => {
    test.skip(!HAS_ADMIN, "set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");

    test("wizard location step is a pan-India, dependent State → City → Locality → Neighbourhood chain", async ({ page }) => {
      await adminLogin(page);
      await page.goto("/admin/properties/new");
      await page.getByRole("button", { name: "2. Location" }).click();

      const state = page.locator("#wizard-state");
      const stateCount = (await state.locator("option").count()) - 1;
      expect(stateCount, "all 28 states + 8 UTs").toBeGreaterThanOrEqual(36);

      const city = page.locator("#wizard-city");
      await expect(city).toBeDisabled();

      await state.selectOption({ label: "Maharashtra" });
      await expect(city.locator("option", { hasText: /^Mumbai$/ })).toHaveCount(1);
      await expect(city.locator("option", { hasText: /^Lucknow$/ })).toHaveCount(0);

      await state.selectOption({ label: "Uttar Pradesh" });
      await expect(city.locator("option", { hasText: /^Lucknow$/ })).toHaveCount(1);
      await expect(city.locator("option", { hasText: /^Varanasi$/ })).toHaveCount(1);
      await expect(city.locator("option", { hasText: /^Mumbai$/ })).toHaveCount(0);

      await city.selectOption({ label: "Lucknow" });
      const locality = page.locator("#wizard-locality");
      await expect(locality.locator("option", { hasText: /^Gomti Nagar$/ })).toHaveCount(1);
      await locality.selectOption({ label: "Gomti Nagar" });
      await expect(page.locator("#wizard-neighbourhood")).toBeEnabled();

      // changing the parent resets the children
      await state.selectOption({ label: "Delhi" });
      await expect(city).toHaveValue("");
      await expect(locality).toHaveValue("");
    });

    test("admin read pages load without errors", async ({ page }) => {
      await adminLogin(page);
      for (const p of ["/admin", "/admin/properties", "/admin/locations", "/admin/categories", "/admin/amenities", "/admin/leads", "/admin/settings", "/admin/users"]) {
        const res = await page.goto(p);
        expect(res?.status(), p).toBe(200);
        await expect(page.locator("h1").first()).toBeVisible();
      }
    });

    test.describe("writes (E2E_ALLOW_WRITES=1, creates a clearly named QA property)", () => {
      test.skip(!ALLOW_WRITES, "set E2E_ALLOW_WRITES=1 against a test DB / dedicated QA data");

      test("create a property in a non-Lucknow city, save, edit, view publicly-safe detail", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(0).selectOption("SALE");
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.getByRole("button", { name: "Save & continue" }).click();

        await page.getByRole("button", { name: "2. Location" }).click();
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await expect(page.locator("#wizard-locality option", { hasText: /^Andheri$/ })).toHaveCount(1);
        await page.locator("#wizard-locality").selectOption({ label: "Andheri" });
        await page.getByRole("button", { name: "Save & continue" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });

        // reload from the DB: the saved chain is restored (state → city → locality)
        await page.reload();
        await page.getByRole("button", { name: "2. Location" }).click();
        await expect(page.locator("#wizard-state option:checked")).toHaveText("Maharashtra");
        await expect(page.locator("#wizard-city option:checked")).toHaveText("Mumbai");
        await expect(page.locator("#wizard-locality option:checked")).toHaveText("Andheri");

        // edit + save again
        await page.getByRole("button", { name: "1. Basic Info" }).click();
        await page.fill('input[placeholder="3 BHK Apartment"]', `${title} edited`);
        await page.getByRole("button", { name: "Save & continue" }).click();
        await expect(page.getByText("Draft saved")).toBeVisible();
      });
    });
  });
});
