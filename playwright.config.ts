import { defineConfig, devices } from "@playwright/test";

/**
 * اختبارات E2E — تعمل على خادم حقيقي (بناء إنتاج) لا على mocks.
 *
 * التشغيل:
 *   E2E_BASE_URL=https://staging.example.com \
 *   E2E_PHONE=01000000000 E2E_PASSWORD=... \
 *   npx playwright test
 *
 * بلا E2E_BASE_URL تُشغِّل `next start` محليًا — لكن سيناريوهات البيع تحتاج API حقيقيًا،
 * لذلك تُتخطّى تلقائيًا إن لم يوجد E2E_API_URL (لا نجاح كاذب).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-android", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npx next start -p 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
