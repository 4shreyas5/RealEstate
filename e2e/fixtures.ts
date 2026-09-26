import { test as base, expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
export const HAS_ADMIN = !!(ADMIN_EMAIL && ADMIN_PASSWORD);
export const ALLOW_WRITES = process.env.E2E_ALLOW_WRITES === "1";
export const QA_TITLE_PREFIX = "QA TEST PROPERTY — DO NOT PUBLISH";

/**
 * Every test gets a watcher that FAILS it on: uncaught JS exceptions, console
 * errors (incl. hydration), HTTP >= 400 responses, failed requests, failed
 * Server Actions and broken <img>s. Tests that expect an error opt out with
 * `allowStatuses` (e.g. a deliberate 404 page).
 */
export const test = base.extend<{ watch: { allowStatuses: number[]; allowConsole: RegExp[] } }>({
  watch: [
    async ({ page }, use) => {
      const problems: string[] = [];
      const opts = { allowStatuses: [] as number[], allowConsole: [] as RegExp[] };
      page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        if (opts.allowConsole.some((re) => re.test(m.text()))) return;
        if (/Failed to load resource/.test(m.text())) return; // reported precisely via `response`
        problems.push(`console.error: ${m.text().slice(0, 200)}`);
      });
      page.on("response", (r) => {
        if (r.status() >= 400 && !opts.allowStatuses.includes(r.status())) {
          problems.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().slice(0, 160)}`);
        }
      });
      page.on("requestfailed", (r) => {
        if (r.url().includes("_rsc=") || r.failure()?.errorText === "net::ERR_ABORTED") return; // prefetch cancellations
        problems.push(`requestfailed ${r.url().slice(0, 160)} ${r.failure()?.errorText}`);
      });
      await use(opts);
      const broken = await brokenImages(page).catch(() => []);
      broken.forEach((src) => problems.push(`broken image ${src}`));
      expect(problems, problems.join("\n")).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export async function brokenImages(page: Page) {
  return page.evaluate(() =>
    [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).map((i) => i.currentSrc.slice(0, 160)),
  );
}

/** Wait for a page that must have rendered its <h1> (a 500 renders "Something went wrong"). */
export async function gotoOk(page: Page, path: string, heading?: RegExp | string) {
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(res?.status(), `${path} status`).toBe(200);
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
  await expect(h1).not.toHaveText(/Something went wrong/i);
  if (heading) await expect(h1).toHaveText(heading);
  return res!;
}

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.fill("#email", ADMIN_EMAIL!);
  await page.fill("#password", ADMIN_PASSWORD!);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/admin(\?.*)?$/, { timeout: 30_000 });
}
