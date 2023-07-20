import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  test("Sample test", async () => {
    await vscode.window.showInformationMessage("Start all tests.");

    assert.strictEqual([1, 2, 3].indexOf(5), -1);
    assert.strictEqual([1, 2, 3].indexOf(0), -1);
  }).timeout(1000 * 60);
});
