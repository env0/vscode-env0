import retry from "async-retry";
import { EnvironmentModel } from "../../../get-environments";
import * as vscode from "vscode";
import sinon from "sinon";
import { Credentials, EnvironmentStatus } from "../../../types";
import { mockGetEnvironment, mockRedeployApiResponse } from "../mocks/server";
import * as jestMock from "jest-mock";
import expect from "expect";
// Importing the compiled extension file to interface with its functionalities (e.g., environment provider) during testing.
// @ts-ignore
import * as extension from "../../../../dist/extension.js";
import { Env0EnvironmentsProvider } from "../../../env0-environments-provider";

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

export enum MessageType {
  INFORMATION = "showInformationMessage",
  ERROR = "showErrorMessage",
  WARNING = "showWarningMessage",
}

export const stubShowMessage = (messageType: MessageType) => {
  const openExternalMock = jestMock.spyOn(vscode.env, "openExternal");
  const mockUriParse = jestMock
    .spyOn(vscode.Uri, "parse")
    .mockImplementation((url) => url as any);
  openExternalMock.mockResolvedValue(true);
  const showMessageMock = jestMock.spyOn(vscode.window, messageType);
  showMessageMock.mockResolvedValue("More info" as any);
  return async function assertShowMessageCalled(
    message: string,
    projectId: string,
    envId: string
  ) {
    // wait for setInterval to invoke refresh
    await waitFor(() => expect(showMessageMock).toHaveBeenCalled());
    expect(showMessageMock).toHaveBeenCalledWith(message, "More info");
    await waitFor(() => expect(openExternalMock).toHaveBeenCalled());
    expect(openExternalMock).toHaveBeenCalledWith(
      expect.stringContaining(`/p/${projectId}/environments/${envId}`)
    );
    openExternalMock.mockReset();
    showMessageMock.mockReset();
    mockUriParse.mockReset();
  };
};

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
