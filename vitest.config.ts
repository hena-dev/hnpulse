import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: false,
        test: {
          name: "scripts",
          include: ["scripts/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: false,
        test: {
          name: "pipeline",
          include: ["pipeline/src/**/*.test.{ts,tsx}"],
          environment: "node",
        },
      },
      "./web/vitest.config.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["scripts/**/*.ts", "pipeline/src/**/*.ts", "web/src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.*",
        "**/*.config.*",
        "**/index.ts",
        "**/*.d.ts",
        "**/_*.ts",
        "**/types.ts",
        "**/*.types.ts",
        "scripts/check-file-size.ts",
        "scripts/gen-placeholder-data.ts",
        "scripts/gen-og-image.ts",
        "scripts/smoke-bq.ts",
        "**/real-*.ts",
        "pipeline/src/index.ts",
        "web/src/pages/**",
        "web/src/layouts/**",
        "web/src/components/**/*.astro",
        "web/src/components/charts/**",
        "web/src/components/dashboard/**",
        "web/src/components/ui/**",
        "web/src/env.d.ts",
      ],
      thresholds: {
        lines: 95,
        branches: 95,
        functions: 95,
        statements: 95,
        perFile: false,
      },
    },
  },
});
