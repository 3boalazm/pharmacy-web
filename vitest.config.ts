import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // اختبارات العقود تعمل فقط عند تمرير CONTRACT_API_URL (بيئة staging)
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
