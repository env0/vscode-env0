import { getEnvironmentMock, login, logout, waitFor } from "./test-utils";
// @ts-ignore
import * as extension from "../../../../dist/extension.js";
import {
  mockGetDeploymentSteps,
  mockGetEnvironment,
  mockGetOrganization,
  mockRedeploy,
} from "../mocks/server";
import { mockGitRepoAndBranch } from "../mocks/git";
import { EnvironmentModel } from "../../../get-environments";
import { Env0EnvironmentsProvider } from "../../../env0-environments-provider";
import { afterEach } from "mocha";
import expect from "expect";
import * as vscode from "vscode";
import * as jestMock from "jest-mock";
import sinon from "sinon";

const auth = { keyId: "key-id", secret: "key-secret" };
const orgId = "org-id";
const initTest = async (environments: EnvironmentModel[]) => {
  mockGetOrganization(orgId, auth);
  mockGetEnvironment(orgId, environments, auth);
  mockGitRepoAndBranch("main", "git@github.com:user/repo.git");
  mockGetDeploymentSteps();
  await login(auth);
  await waitFor(() =>
    expect(getFirstEnvIconPath()).toContain(activeEnvironmentIconPath)
  );
};
enum MessageType {
  INFORMATION = "showInformationMessage",
  ERROR = "showErrorMessage",
  WARNING = "showWarningMessage",
}

const stubShowMessage = (messageType: MessageType) => {
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

const getFirstEnvIconPath = () => {
  const environmentsDataProvider =
    extension.environmentsDataProvider as Env0EnvironmentsProvider;
  const environments = environmentsDataProvider.getChildren();
  return environments[0].iconPath;
};

const getFirstEnvStatus = () => {
  const environmentsDataProvider =
    extension.environmentsDataProvider as Env0EnvironmentsProvider;
  const environments = environmentsDataProvider.getChildren();
  return environments[0].status;
};

const activeEnvironmentIconPath = "favicon-16x16.png";
const inProgressIconPath = "in_progress.png";

suite("environment actions", function () {
  this.timeout(1000 * 10);
  afterEach(async () => {
    sinon.restore();
    await logout();
    await extension._reset();
  });

  test("should redeploy when user redeploy", async () => {
    const envName = "my env";
    const environmentMock = getEnvironmentMock(
      "main",
      "https://github.com/user/repo",
      {
        name: envName,
      }
    );

    await initTest([environmentMock]);

    const onRedeployCalled = jestMock.fn();
    mockRedeploy(environmentMock.id, auth, onRedeployCalled);

    vscode.commands.executeCommand("env0.redeploy", environmentMock);
    await waitFor(() => expect(onRedeployCalled).toHaveBeenCalled());
  });

  test("should update environment icon and status when redeploy", async () => {
    const envName = "my env";
    const environmentMock = getEnvironmentMock(
      "main",
      "https://github.com/user/repo",
      {
        name: envName,
      }
    );

    await initTest([environmentMock]);
    mockRedeploy(environmentMock.id, auth);
    vscode.commands.executeCommand("env0.redeploy", environmentMock);

    const inProgressEnvironment: EnvironmentModel = {
      ...environmentMock,
      status: "DEPLOY_IN_PROGRESS",
      updatedAt: Date.now().toString(),
    };
    mockGetEnvironment(orgId, [inProgressEnvironment], auth);
    // wait for the auto polling that will update the environment status icon
    await waitFor(() =>
      expect(getFirstEnvIconPath()).toContain(inProgressIconPath)
    );
    expect(getFirstEnvStatus()).toBe("DEPLOY_IN_PROGRESS");

    const successfullyDeployedEnvironment: EnvironmentModel = {
      ...inProgressEnvironment,
      status: "ACTIVE",
      updatedAt: Date.now().toString(),
    };
    mockGetEnvironment(orgId, [successfullyDeployedEnvironment], auth);
    await waitFor(() =>
      expect(getFirstEnvIconPath()).toContain(activeEnvironmentIconPath)
    );
    expect(getFirstEnvStatus()).toBe("ACTIVE");
  });

  test("should show information message when redeploy", async () => {
    let assertShowInformationMessageCalled = stubShowMessage(
      MessageType.INFORMATION
    );

    const envName = "my env";
    const environmentMock = getEnvironmentMock(
      "main",
      "https://github.com/user/repo",
      {
        name: envName,
      }
    );

    await initTest([environmentMock]);
    mockRedeploy(environmentMock.id, auth);
    vscode.commands.executeCommand("env0.redeploy", environmentMock);

    const inProgressEnvironment: EnvironmentModel = {
      ...environmentMock,
      status: "DEPLOY_IN_PROGRESS",
      updatedAt: Date.now().toString(),
    };
    mockGetEnvironment(orgId, [inProgressEnvironment], auth);

    await assertShowInformationMessageCalled(
      `Environment ${envName} is in progress...`,
      environmentMock.projectId,
      environmentMock.id
    );
    const successfullyDeployedEnvironment: EnvironmentModel = {
      ...inProgressEnvironment,
      status: "ACTIVE",
      updatedAt: Date.now().toString(),
    };

    assertShowInformationMessageCalled = stubShowMessage(
      MessageType.INFORMATION
    );

    mockGetEnvironment(orgId, [successfullyDeployedEnvironment], auth);
    await assertShowInformationMessageCalled(
      `Environment ${envName} is ACTIVE!`,
      environmentMock.projectId,
      environmentMock.id
    );
  });

  test("should show error message when redeploy fail", async () => {
    const assertShowErrorMessageCalled = stubShowMessage(MessageType.ERROR);

    const envName = "my env";
    const environmentMock = getEnvironmentMock(
      "main",
      "https://github.com/user/repo",
      {
        name: envName,
      }
    );

    await initTest([environmentMock]);
    mockRedeploy(environmentMock.id, auth);
    vscode.commands.executeCommand("env0.redeploy", environmentMock);
    const errorMessage = "some error";
    const failedEnvironment: EnvironmentModel = {
      ...environmentMock,
      status: "FAILED",
      updatedAt: Date.now().toString(),
      latestDeploymentLog: {
        ...environmentMock.latestDeploymentLog,
        error: { message: errorMessage },
      },
    };
    mockGetEnvironment(orgId, [failedEnvironment], auth);

    await assertShowErrorMessageCalled(
      `Deployment has failed for environment ${envName}. Error: ${errorMessage}`,
      environmentMock.projectId,
      environmentMock.id
    );
  });
});
