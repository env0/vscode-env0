import { vscode } from "../vscode";
describe("Extension Test Suite", () => {
  it("Sample test", async () => {
    await vscode.window.showInformationMessage("Hello World from yotest!");
    expect(1).toBe(1);
  });
});
