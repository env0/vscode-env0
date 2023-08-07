import retry from "async-retry";
import { EnvironmentModel } from "../../../get-environments";
import * as vscode from "vscode";
import sinon from "sinon";
import { Credentials } from "../../../types";

export const waitFor = <T>(
  callback: (...args: any[]) => T,
  retries = 5
): Promise<T> => {
  return retry(callback, { retries, minTimeout: 300, maxTimeout: 1000 });
};

export const login = async (auth: Credentials) => {
  const inputStub = sinon.stub(vscode.window, "showInputBox");
  inputStub.onFirstCall().resolves(auth.keyId);
  inputStub.onSecondCall().resolves(auth.secret);
  await vscode.commands.executeCommand("env0.login");
};

export const logout = async () => {
  await vscode.commands.executeCommand("env0.logout");
};

export const getEnvironmentMock = (
  branchName: string,
  repoUrl: string,
  overrides?: Partial<EnvironmentModel>
): EnvironmentModel => ({
  id: "env-1",
  name: "test-env",
  projectId: "project-id",
  status: "ACTIVE",
  updatedAt: "2022-09-05T13:45:31.000Z",
  latestDeploymentLog: {
    id: "id",
    blueprintRevision: branchName,
    blueprintRepository: repoUrl,
  },
  ...overrides,
});
