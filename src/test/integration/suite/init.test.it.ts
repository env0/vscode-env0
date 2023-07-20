import * as assert from "assert";
import * as vscode from "vscode";
import sinon from "sinon";
import { mockGetOrganization } from "../mocks/server";

const auth = { keyId: "key-id", secret: "key-secret" };

suite("init", () => {
  test("should show environments", async () => {
    mockGetOrganization(auth);
    const inputStub = sinon.stub(vscode.window, "showInputBox");
    inputStub.onFirstCall().resolves(auth.keyId);
    inputStub.onSecondCall().resolves(auth.secret);

    await vscode.commands.executeCommand("env0.login");
  }).timeout(1000 * 60);
});
