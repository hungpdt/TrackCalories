import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Chỉ unit test; E2E chạy bằng Playwright trong tests/e2e.
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
