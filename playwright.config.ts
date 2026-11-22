import { defineConfig, devices } from "@playwright/test";

// Máy local dùng Edge có sẵn (chưa tải Chromium của Playwright). CI dùng Chromium đi kèm;
// đặt PLAYWRIGHT_CHANNEL (ví dụ "chrome") để chọn trình duyệt khác.
const channel = process.env.PLAYWRIGHT_CHANNEL ?? (process.env.CI ? undefined : "msedge");

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100",
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel } },
  ],
});
