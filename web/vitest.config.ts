import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.*",
        "**/*.config.*",
        "**/index.ts",
        "**/*.d.ts",
        "src/pages/**",
        "src/components/**/*.astro",
        "src/components/charts/**",
        "src/components/dashboard/**",
        "src/components/ui/**",
      ],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
        perFile: true,
      },
    },
  },
});
