import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          globals: true,
          environment: "jsdom",
          setupFiles: ["./test/setup.ts"],
          include: ["test/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["test/content/overlay-manager.real.test.ts"],
          coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
            reportsDirectory: "./coverage",
            include: [
              "entrypoints/background.ts",
              "lib/vscode-bridge.ts",
              "stores/use-settings-store.ts",
              "stores/use-tools-store.ts",
              "stores/use-ui-store.ts",
              "stores/use-connection-store.ts",
              "stores/use-chat-sessions-store.ts",
            ],
            exclude: ["tools/types.ts", "**/*.test.ts", "**/*.d.ts"],
            thresholds: {
              lines: 70,
              functions: 45,
              perFile: true,
            },
          },
        },
      },
      {
        extends: true,
        test: {
          name: "real-overlay",
          globals: true,
          environment: "jsdom",
          include: ["test/content/overlay-manager.real.test.ts"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
