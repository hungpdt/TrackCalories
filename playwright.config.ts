import { defineConfig, devices } from "@playwright/test";

// Máy local dùng Edge có sẵn (chưa tải Chromium của Playwright). CI dùng Chromium đi kèm;
// đặt PLAYWRIGHT_CHANNEL (ví dụ "chrome") để chọn trình duyệt khác.
const channel = process.env.PLAYWRIGHT_CHANNEL ?? (process.env.CI ? undefined : "msedge");

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:3100" },
  webServer: [
    {
      command: "npm run dev -- --port 3100",
      url: "http://127.0.0.1:3100",
      timeout: 60_000,
      // E2E dùng AI giả lập, không gọi OpenAI.
      env: { AI_PROVIDER: "mock" },
    },
    {
      // Cổng HTTPS tự ký cho test điện thoại qua HTTPS (tests/e2e/mobile-capture.spec.ts).
      command: "node scripts/dev-https.mjs --proxy-only --target 3100 --port 3543",
      url: "https://127.0.0.1:3543/login",
      ignoreHTTPSErrors: true,
      timeout: 60_000,
    },
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel } },
  ],
});
