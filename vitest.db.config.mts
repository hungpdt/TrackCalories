import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Test database cần Supabase local đang chạy (`npx supabase start`).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/db/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
