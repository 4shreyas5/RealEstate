import { defineConfig } from "@playwright/test";

/**
 * Production-style E2E. Point it at any deployment with BASE_URL, e.g.
 *   BASE_URL=https://www.dreamit.co.in npm run e2e          (read-only tests)
 *   E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npm run e2e      (+ admin read tests)
 *   E2E_ALLOW_WRITES=1 …                                    (+ creates a clearly named QA property)
 * Without BASE_URL it starts `npm run start` on :3000 (run `npm run build` first).
 * One worker: the database pool is small and several specs share admin state.
 */
export default defineConfig({
  testDir: "./e2e",
  // Seeds/removes exactly one clearly-labelled PUBLISHED QA property so
  // read-only specs that need real public listings don't depend on the
  // current state of real data — see e2e/global-setup.ts.
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run start",
        // A static route, deliberately not one that populates the
        // "locations" data cache — global-setup.ts seeds a published
        // property right after this readiness check, and a cached empty
        // result from the health check would shadow it for several minutes.
        url: "http://localhost:3000/robots.txt",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
