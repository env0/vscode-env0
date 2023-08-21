import retry from "async-retry";
import { EnvironmentModel } from "../../../get-environments";
import * as vscode from "vscode";
import { Credentials, EnvironmentStatus } from "../../../types";
import { mockGetEnvironment, mockRedeployApiResponse } from "../mocks/server";
import * as jestMock from "jest-mock";
import expect from "expect";
// Importing the compiled extension file to interface with its functionalities (e.g., environment provider) during testing.
// @ts-ignore
import * as extension from "../../../../dist/extension.js";
import { Env0EnvironmentsProvider } from "../../../env0-environments-provider";

export const waitFor = <T>(
  callback: (...args: unknown[]) => T,
  retries = 5
): Promise<T> => {
  return retry(callback, { retries, minTimeout: 300, maxTimeout: 1000 });
};

export const login = async (auth: Credentials) => {
  const inputMock = jestMock.spyOn(vscode.window, "showInputBox");
  inputMock
    .mockResolvedValueOnce(auth.keyId)
    .mockResolvedValueOnce(auth.secret);

  await vscode.commands.executeCommand("env0.login");
  inputMock.mockRestore();
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

export enum MessageType {
  INFORMATION = "showInformationMessage",
  ERROR = "showErrorMessage",
  WARNING = "showWarningMessage",
}

export const redeploy = async ({
  environment,
  auth,
  onRedeployApiRequest,
  orgId,
}: {
  environment: EnvironmentModel;
  auth: Credentials;
  orgId: string;
  onRedeployApiRequest?: typeof jestMock.fn;
}) => {
  mockRedeployApiResponse(environment.id, auth, onRedeployApiRequest);
  vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());
  const inProgressEnvironment: EnvironmentModel = {
    ...environment,
    status: EnvironmentStatus.DEPLOY_IN_PROGRESS,
    updatedAt: Date.now().toString(),
    latestDeploymentLog: {
      ...environment.latestDeploymentLog,
      id: "new-deployment-id",
    },
  };
  mockGetEnvironment(orgId, [inProgressEnvironment], auth);
  await waitFor(() => expect(getFirstEnvStatus()).toBe("DEPLOY_IN_PROGRESS"));
  return inProgressEnvironment;
};

export const getEnvironmentDataProvider = () => {
  return extension.environmentsDataProvider as Env0EnvironmentsProvider;
};

export const getFirstEnvironment = () => {
  const environmentsDataProvider = getEnvironmentDataProvider();
  return environmentsDataProvider.getChildren()[0];
};

export const getFirstEnvIconPath = () => getFirstEnvironment().iconPath;
export const getFirstEnvStatus = () => getFirstEnvironment().status;

export const resetExtension = async () => {
  await extension._reset();
};
