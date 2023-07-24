import * as assert from "assert";
import * as vscode from "vscode";
import sinon from "sinon";
import { mockGetEnvironment, mockGetOrganization } from "../mocks/server";
import { mockGitRepoAndBranch } from "../mocks/git";
import retry from "async-retry";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as extension from "../../../../dist/extension.js";
import { Env0EnvironmentsProvider } from "../../../env0-environments-provider";

const auth = { keyId: "key-id", secret: "key-secret" };

suite("init", () => {
  test("should show environments", async () => {
    const orgId = "org-id";
    const envName = "my env";
    mockGetOrganization(orgId, auth);
    const inputStub = sinon.stub(vscode.window, "showInputBox");
    inputStub.onFirstCall().resolves(auth.keyId);
    inputStub.onSecondCall().resolves(auth.secret);
    mockGetEnvironment(orgId, [
      {
        id: "env-1",
        name: envName,
        projectId: "project-id",
        status: "ACTIVE",
        latestDeploymentLog: {
          id: "id",
          blueprintRevision: "main",
          blueprintRepository: "https://github.com/user/repo",
        },
      } as any,
    ]);
    mockGitRepoAndBranch("main", "git@github.com:user/repo.git");
    vscode.commands.executeCommand("env0.login");

    const environmentsDataProvider =
      extension.environmentsDataProvider as Env0EnvironmentsProvider;
    await retry(
      () => {
        const environmentItem = environmentsDataProvider.getChildren()[0];
        assert.strictEqual(environmentItem.label, envName);
      },
      {
        factor: 1,
        minTimeout: 1000,
        retries: 10,
      }
    );
  }).timeout(1000 * 60);
});
