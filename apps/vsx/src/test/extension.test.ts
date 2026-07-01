import assert from "node:assert";
import * as vscode from "vscode";

/**
 * Smoke test: the extension activates and contributes the documented
 * commands. Runs under the @vscode/test-electron extension host.
 *
 * Detailed unit coverage of the bridge lives in `server.test.ts` (no VS Code
 * needed).
 */
suite("Extension smoke", () => {
  test("extension is present and activates", async () => {
    const ext = vscode.extensions.getExtension("fdh.fdh-vsx");
    assert.ok(ext, "Extension fdh.fdh-vsx is not installed");
    await ext!.activate();
    assert.strictEqual(ext!.isActive, true);
  });

  test("commands are registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("fdh.restartServer"),
      "fdh.restartServer missing",
    );
    assert.ok(commands.includes("fdh.showStatus"), "fdh.showStatus missing");
  });
});
