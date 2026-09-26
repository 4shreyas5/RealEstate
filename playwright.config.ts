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
    : { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
