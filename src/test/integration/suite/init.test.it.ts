import vscode from "vscode";

describe("Extension Test Suite", () => {
  it("Sample test", async () => {
    expect(Object.keys(vscode).length).toBeGreaterThan(1);
    await vscode.window.showInformationMessage("Hello World from yotest!");
    expect(1).toBe(1);
  });
});
