import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import pkg from "./package.json" with { type: "json" };
import { toolCount } from "./tools/metadata";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Frontend Dev Helper",
    // Single source of truth: apps/ext/package.json. The Chrome Web Store
    // rejects uploads whose manifest version disagrees with the package
    // version, so we read it once at build time.
    version: pkg.version,
    // Phase 1.7: tool count derived from the registry so the manifest never
    // drifts from the actual loader count again.
    description: `A comprehensive frontend debugging toolkit with ${toolCount} tools for inspection, CSS analysis, performance profiling, accessibility auditing, and AI-powered analysis.`,
    permissions: [
      "activeTab",
      "storage",
      "tabs",
      "scripting",
      "clipboardWrite",
      "notifications",
      "contextMenus",
      "sidePanel",
    ],
    // Opt-in per origin (Phase 2.2). Content scripts only inject after the
    // user grants host access via "Enable on this site".
    optional_host_permissions: ["http://*/*", "https://*/*"],
    side_panel: {
      default_path: "sidepanel.html",
    },
    web_accessible_resources: [
      {
        resources: ["profiler-bridge-main-world.js"],
        matches: ["<all_urls>"],
      },
    ],
    commands: {
      "toggle-pesticide": {
        suggested_key: { default: "Alt+Shift+D" },
        description: "Toggle DOM Outliner",
      },
      "toggle-inspector": {
        suggested_key: { default: "Alt+Shift+I" },
        description: "Toggle Element Inspector",
      },
      "open-command-palette": {
        suggested_key: { default: "Alt+Shift+P" },
        description: "Open Command Palette",
      },
      "disable-all-tools": {
        suggested_key: { default: "Alt+Shift+0" },
        description: "Disable All Tools",
      },
    },
  },
  vite: () => ({
    resolve: {
      alias: {
        "@": ".",
      },
    },
    plugins: [tailwindcss()],
  }),
});
