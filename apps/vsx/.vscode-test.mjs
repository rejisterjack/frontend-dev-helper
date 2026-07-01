import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out/test/**/*.test.js",
  // Run the unit tests that don't touch the `vscode` API under plain Node,
  // so we don't need to spin up the extension host for them. The
  // `vscode-test` runner picks up the compiled `out/test/*.test.js`.
  mocha: {
    timeout: 10000,
  },
});
