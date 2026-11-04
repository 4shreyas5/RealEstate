import { test, expect, HAS_ADMIN, ALLOW_WRITES, adminLogin, QA_TITLE_PREFIX } from "./fixtures";

test.describe("admin (needs E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD)", () => {
  test("unauthenticated visitors are redirected to /admin/login", async ({ page }) => {
    await page.goto("/admin/properties/new");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator("h1")).toHaveText(/Admin sign in/);
  });

  test.describe("signed in", () => {
    test.skip(!HAS_ADMIN, "set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");

    test("location section is a pan-India, dependent State → City → Locality → Neighbourhood chain", async ({ page }) => {
      await adminLogin(page);
      await page.goto("/admin/properties/new");

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

    test("properties listing: search, filters, sort and pagination all preserve each other", async ({ page }) => {
      await adminLogin(page);

      await page.goto("/admin/properties");
      await expect(page.locator("h1")).toHaveText("Properties");

      // Search by title.
      await page.fill("#admin-properties-q", "Apartment");
      await page.getByRole("button", { name: "Apply" }).click();
      await expect(page).toHaveURL(/q=Apartment/);

      // Combine with a status filter and a sort — all three must survive together.
      await page.selectOption("#admin-properties-status", "PUBLISHED");
      await page.selectOption("#admin-properties-sort", "price_desc");
      await page.getByRole("button", { name: "Apply" }).click();
      await expect(page).toHaveURL(/q=Apartment/);
      await expect(page).toHaveURL(/status=PUBLISHED/);
      await expect(page).toHaveURL(/sort=price_desc/);

      // Clear filters resets to a plain listing.
      await page.getByRole("link", { name: "Clear filters" }).click();
      await expect(page).toHaveURL(/\/admin\/properties$/);
      await expect(page.locator("#admin-properties-q")).toHaveValue("");

      // A query matching a city/locality name (not just title) must also return results, not error.
      await page.fill("#admin-properties-q", "Lucknow");
      await page.getByRole("button", { name: "Apply" }).click();
      await expect(page.locator("table")).toBeVisible();
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
        await page.fill("#wizard-description", "A lovely QA-only test listing.");
        await page.fill("#wizard-price", "5000000");
        await page.fill("#wizard-area-value", "1200");

        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await expect(page.locator("#wizard-locality option", { hasText: /^Andheri$/ })).toHaveCount(1);
        await page.locator("#wizard-locality").selectOption({ label: "Andheri" });

        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });

        // reload from the DB: the saved chain is restored (state → city → locality)
        await page.reload();
        await expect(page.locator("#wizard-state option:checked")).toHaveText("Maharashtra");
        await expect(page.locator("#wizard-city option:checked")).toHaveText("Mumbai");
        await expect(page.locator("#wizard-locality option:checked")).toHaveText("Andheri");

        // edit + save again
        await page.fill('input[placeholder="3 BHK Apartment"]', `${title} edited`);
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(page.getByText("Saved")).toBeVisible();
      });

      test("agricultural-style plot: create with only basic info, location and plot area — no residential fields, amenities or SEO", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} Plot ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(0).selectOption("SALE");
        // "Plots" category exercises the land spec profile (no bedrooms/bathrooms/parking shown).
        await page.locator("select").nth(1).selectOption({ label: "Plots" });
        await page.fill("#wizard-description", "QA-only plot, no residential specs entered.");
        await page.fill("#wizard-price", "2000000");
        await page.fill("#wizard-area-value", "5000");

        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });

        await expect(page.locator("label", { hasText: "Bedrooms" })).toHaveCount(0);

        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });
        await expect(page.locator("body")).not.toContainText("Select a category, city, and locality");
      });

      test("minimal valid property: only required fields, every optional section left empty", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} Minimal ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "Minimal QA listing.");
        await page.fill("#wizard-price", "1000000");
        await page.fill("#wizard-area-value", "800");

        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });

        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });
      });

      test("manual locality: typing a new locality name saves successfully, no duplicate on a second save", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} Manual locality ${Date.now()}`;
        const localityName = `QA Locality ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "QA-only listing with a typed locality.");
        await page.fill("#wizard-price", "3000000");
        await page.fill("#wizard-area-value", "1000");

        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.fill("#wizard-locality-new", localityName);

        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });

        // Saving again with the same typed name must reuse the locality, not duplicate it.
        await page.fill("#wizard-locality-new", localityName);
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(page.getByText("Saved")).toBeVisible();
      });

      test("property without a locality can be created and then edited", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} No Locality ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "QA-only listing with no locality at all.");
        await page.fill("#wizard-price", "4200000");
        await page.fill("#wizard-area-value", "950");

        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        // Deliberately leave #wizard-locality at "No locality".

        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });
        await expect(page.locator("#wizard-locality")).toHaveValue("");

        // Edit again without ever picking a locality — must save cleanly.
        await page.fill("#wizard-description", "Updated description, still no locality.");
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(page.getByText("Saved")).toBeVisible();
      });

      test("full publish lifecycle: publishes with zero photos, then unavailable → restored, then deleted", async ({ page }) => {
        // Photographs must never be mandatory for publishing.
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} Lifecycle ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "QA-only full lifecycle listing.");
        await page.fill("#wizard-price", "6000000");
        await page.fill("#wizard-area-value", "1300");
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });
        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });

        // Publishing with zero photos must succeed — photos are optional.
        await page.getByRole("button", { name: "Publish" }).click();
        await page.waitForURL(/\/admin\/properties$/, { timeout: 30_000 });

        // Find the row in the listing, mark it unavailable, then restore it.
        await page.fill("#admin-properties-q", title);
        await page.getByRole("button", { name: "Apply" }).click();
        const row = page.locator("tr", { hasText: title });
        await expect(row).toBeVisible();
        await row.locator('select[aria-label^="Status for"]').selectOption("UNAVAILABLE");
        await expect(row.locator('select[aria-label^="Status for"]')).toHaveValue("UNAVAILABLE", { timeout: 10_000 });
        await row.locator('select[aria-label^="Status for"]').selectOption("PUBLISHED");
        await expect(row.locator('select[aria-label^="Status for"]')).toHaveValue("PUBLISHED", { timeout: 10_000 });

        // Delete it — confirm dialog, then it disappears from the table.
        page.once("dialog", (dialog) => dialog.accept());
        await row.getByRole("button", { name: "Delete" }).click();
        await expect(page.locator("tr", { hasText: title })).toHaveCount(0, { timeout: 10_000 });
      });

      test("publish with one photo: a cover and alt text are enough, no minimum count", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} One Photo ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "QA-only, exactly one photo.");
        await page.fill("#wizard-price", "4100000");
        await page.fill("#wizard-area-value", "1000");
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });
        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });

        await page.locator("#image-upload").setInputFiles(["public/images/hero/carousel-01.jpg"]);
        const altInput = page.locator('input[placeholder="Alt text (required)"]');
        await expect(altInput).toHaveCount(1, { timeout: 30_000 });
        await altInput.fill("QA one-photo alt text");
        await altInput.blur();
        // A single uploaded image is auto-set as cover by the upload flow itself.

        await page.getByRole("button", { name: "Publish" }).click();
        await page.waitForURL(/\/admin\/properties$/, { timeout: 30_000 });
      });

      test("publish blocked when images exist but no cover is chosen, and when one is missing alt text", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} Cover And Alt Blockers ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "QA-only, cover/alt text blocker checks.");
        await page.fill("#wizard-price", "4300000");
        await page.fill("#wizard-area-value", "1050");
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });
        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });

        await page.locator("#image-upload").setInputFiles([
          "public/images/hero/carousel-01.jpg",
          "public/images/hero/carousel-02.jpg",
        ]);
        const altInputs = page.locator('input[placeholder="Alt text (required)"]');
        await expect(altInputs).toHaveCount(2, { timeout: 30_000 });

        // Neither image has alt text yet, and the first upload auto-claimed cover —
        // fill alt text for both, then deliberately leave the cover alone and verify
        // the missing-alt-text case first by only filling one.
        await altInputs.nth(0).fill("QA cover-and-alt photo 1");
        await altInputs.nth(0).blur();
        // Second photo deliberately left without alt text.
        await page.getByRole("button", { name: "Publish" }).click();
        await expect(page.getByText(/needs alt text/)).toBeVisible();

        await altInputs.nth(1).fill("QA cover-and-alt photo 2");
        await altInputs.nth(1).blur();
        // Now both have alt text and a cover is already set (first upload) — must succeed.
        await page.getByRole("button", { name: "Publish" }).click();
        await page.waitForURL(/\/admin\/properties$/, { timeout: 30_000 });
      });

      test("publish via the row status dropdown respects the same rules as the dedicated button", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} Row Status Publish ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "QA-only, published via the row status dropdown.");
        await page.fill("#wizard-price", "3900000");
        await page.fill("#wizard-area-value", "980");
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });
        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });

        await page.goto("/admin/properties");
        await page.fill("#admin-properties-q", title);
        await page.getByRole("button", { name: "Apply" }).click();
        const row = page.locator("tr", { hasText: title });
        await expect(row).toBeVisible();
        // Zero photos — publishing through the row dropdown must succeed exactly
        // like the dedicated Publish button does.
        await row.locator('select[aria-label^="Status for"]').selectOption("PUBLISHED");
        await expect(row.locator('select[aria-label^="Status for"]')).toHaveValue("PUBLISHED", { timeout: 10_000 });
      });

      test("publish via bulk actions respects the same rules, with per-row blockers reported", async ({ page }) => {
        await adminLogin(page);

        // One publishable property (zero photos, fine) and one that will be
        // blocked (has a photo but no alt text).
        await page.goto("/admin/properties/new");
        const okTitle = `${QA_TITLE_PREFIX} Bulk OK ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', okTitle);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "QA-only, bulk-publishable.");
        await page.fill("#wizard-price", "4000000");
        await page.fill("#wizard-area-value", "1000");
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });
        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });

        await page.goto("/admin/properties/new");
        const blockedTitle = `${QA_TITLE_PREFIX} Bulk Blocked ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', blockedTitle);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "QA-only, bulk-blocked on alt text.");
        await page.fill("#wizard-price", "4050000");
        await page.fill("#wizard-area-value", "1010");
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });
        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });
        await page.locator("#image-upload").setInputFiles(["public/images/hero/carousel-01.jpg"]);
        await expect(page.locator('input[placeholder="Alt text (required)"]')).toHaveCount(1, { timeout: 30_000 });
        // Deliberately leave alt text empty.

        await page.goto("/admin/properties");
        await page.fill("#admin-properties-q", QA_TITLE_PREFIX);
        await page.getByRole("button", { name: "Apply" }).click();
        await page.locator("tr", { hasText: okTitle }).locator('input[type="checkbox"]').check();
        await page.locator("tr", { hasText: blockedTitle }).locator('input[type="checkbox"]').check();

        page.once("dialog", (dialog) => dialog.accept());
        await page.getByRole("button", { name: "Publish" }).click();

        await expect(page.locator("tr", { hasText: okTitle }).locator('select[aria-label^="Status for"]')).toHaveValue(
          "PUBLISHED",
          { timeout: 10_000 },
        );
        await expect(
          page.locator("tr", { hasText: blockedTitle }).locator('select[aria-label^="Status for"]'),
        ).not.toHaveValue("PUBLISHED");
        await expect(page.getByText(/needs alt text/)).toBeVisible();
      });

      test("apartment for sale: never touching the Buy/Rent or Property type defaults still submits correctly", async ({ page }) => {
        // Regression test for the exact reported bug: "Invalid input: expected
        // string, received undefined" when Listing purpose/Property type were
        // never explicitly re-clicked by the admin.
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} Untouched Defaults ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        // Listing purpose intentionally left on its default "Buy (for sale)".
        await page.locator("select").nth(1).selectOption({ label: "Apartments" });
        await page.fill("#wizard-description", "QA-only, defaults never touched.");
        await page.fill("#wizard-price", "4500000");
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });
        await page.fill("#wizard-area-value", "1100");

        await page.getByRole("button", { name: "Create property" }).click();
        await expect(page.getByText(/Invalid (input|option)/)).toHaveCount(0);
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });
      });

      test("submitting with no Property type selected shows an inline error next to the field, not a crash", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} No Category ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        // Property type deliberately left at "Select a type".
        await page.fill("#wizard-description", "QA-only, no property type chosen.");
        await page.fill("#wizard-price", "1000000");
        await page.fill("#wizard-area-value", "500");

        await page.getByRole("button", { name: "Create property" }).click();
        await expect(page.getByText("Property type is required")).toBeVisible();
        await expect(page.getByText(/Invalid (input|option)/)).toHaveCount(0);
        // Nothing was created, and everything else the admin typed is still there.
        await expect(page.locator('input[placeholder="3 BHK Apartment"]')).toHaveValue(title);
        await expect(page).toHaveURL(/\/admin\/properties\/new/);
      });

      test("agricultural land for rent, and a residential plot for sale — both selectable, both skip residential specs", async ({ page }) => {
        await adminLogin(page);
        for (const [categoryLabel, listingLabel] of [
          ["Agricultural Land", "RENT"],
          ["Residential Plot", "SALE"],
        ] as const) {
          await page.goto("/admin/properties/new");
          const title = `${QA_TITLE_PREFIX} ${categoryLabel} ${Date.now()}`;
          await page.fill('input[placeholder="3 BHK Apartment"]', title);
          await page.locator("select").nth(0).selectOption(listingLabel);
          await page.locator("select").nth(1).selectOption({ label: categoryLabel });
          await expect(page.locator("label", { hasText: "Bedrooms" })).toHaveCount(0);
          await page.fill("#wizard-description", `QA-only ${categoryLabel}.`);
          await page.fill("#wizard-price", "1500000");
          await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
          await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
          await page.locator("#wizard-locality").selectOption({ index: 1 });
          await page.fill("#wizard-area-value", "3");
          await page.getByRole("button", { name: "Create property" }).click();
          await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });
        }
      });

      test("staged photos: select before creating, then they're uploaded and associated once the property exists", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} Staged Photos ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(1).selectOption({ label: "Agricultural Land" });
        await page.fill("#wizard-description", "QA-only agricultural land with staged photos.");
        await page.fill("#wizard-price", "2200000");
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });
        await page.fill("#wizard-area-value", "4");

        // Select photos BEFORE the property exists.
        await page.locator("#staged-image-upload").setInputFiles([
          "public/images/hero/carousel-01.jpg",
          "public/images/hero/carousel-02.jpg",
        ]);
        await expect(page.locator('input[placeholder="Alt text"]')).toHaveCount(2);
        await page.locator('input[placeholder="Alt text"]').nth(0).fill("Open field");
        await page.locator('input[placeholder="Alt text"]').nth(1).fill("Road access");
        await page.getByRole("button", { name: "Make cover" }).first().click();

        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });
        // The real ImageManager now shows both, uploaded and associated.
        await expect(page.locator('input[placeholder="Alt text (required)"]')).toHaveCount(2, { timeout: 30_000 });
      });

      test("property without photographs, amenities, locality or SEO still creates successfully", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} Bare Minimum ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "QA-only, nothing optional filled in.");
        await page.fill("#wizard-price", "900000");
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        // Locality, amenities, SEO, and photos all deliberately left empty.
        await page.fill("#wizard-area-value", "700");
        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });
      });

      test("a staged photo upload that fails stays retryable without creating a second property or losing other photos", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} Upload Retry ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "QA-only upload-failure retry test.");
        await page.fill("#wizard-price", "3000000");
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });
        await page.fill("#wizard-area-value", "1200");

        await page.locator("#staged-image-upload").setInputFiles([
          "public/images/hero/carousel-01.jpg",
          "public/images/hero/carousel-02.jpg",
        ]);

        // Simulate one upload failing: abort every Supabase Storage upload
        // request for this run. The property itself must still be created.
        await page.route("**/storage/v1/object/**", (route) => route.abort());
        await page.getByRole("button", { name: "Create property" }).click();
        await expect(page.getByText(/didn.?t upload/)).toBeVisible({ timeout: 30_000 });
        // A failed upload must never navigate away from the one place that can retry it.
        await expect(page).toHaveURL(/\/admin\/properties\/new/);

        // Now let uploads succeed and retry.
        await page.unroute("**/storage/v1/object/**");
        await page.getByRole("button", { name: "Retry" }).first().click();
        await expect(page.getByText(/didn.?t upload/)).toHaveCount(0, { timeout: 30_000 });

        // Exactly one property with this title exists.
        await page.goto("/admin/properties");
        await page.fill("#admin-properties-q", title);
        await page.getByRole("button", { name: "Apply" }).click();
        await expect(page.locator("tr", { hasText: title })).toHaveCount(1);
      });

      test("editing a saved property keeps its uploaded photos correctly associated", async ({ page }) => {
        await adminLogin(page);
        await page.goto("/admin/properties/new");
        const title = `${QA_TITLE_PREFIX} Edit Keeps Photos ${Date.now()}`;
        await page.fill('input[placeholder="3 BHK Apartment"]', title);
        await page.locator("select").nth(1).selectOption({ index: 1 });
        await page.fill("#wizard-description", "QA-only edit-keeps-photos check.");
        await page.fill("#wizard-price", "2500000");
        await page.locator("#wizard-state").selectOption({ label: "Maharashtra" });
        await page.locator("#wizard-city").selectOption({ label: "Mumbai" });
        await page.locator("#wizard-locality").selectOption({ index: 1 });
        await page.fill("#wizard-area-value", "900");
        await page.locator("#staged-image-upload").setInputFiles(["public/images/hero/carousel-01.jpg"]);
        await page.getByRole("button", { name: "Create property" }).click();
        await page.waitForURL(/\/admin\/properties\/(?!new)[^/]+$/, { timeout: 30_000 });
        await expect(page.locator('input[placeholder="Alt text (required)"]')).toHaveCount(1, { timeout: 30_000 });

        await page.fill('input[placeholder="3 BHK Apartment"]', `${title} edited`);
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(page.getByText("Saved")).toBeVisible();
        await page.reload();
        await expect(page.locator('input[placeholder="Alt text (required)"]')).toHaveCount(1);
      });
    });
  });
});
