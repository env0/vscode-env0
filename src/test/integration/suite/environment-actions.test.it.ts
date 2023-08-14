import { getEnvironmentMock, login, logout, waitFor } from "./test-utils";
// @ts-ignore
import * as extension from "../../../../dist/extension.js";
import {
  mockApprove,
  mockCancel,
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

const getEnvironmentDataProvider = () => {
  return extension.environmentsDataProvider as Env0EnvironmentsProvider;
};

const getFirstEnvironment = () => {
  const environmentsDataProvider = getEnvironmentDataProvider();
  return environmentsDataProvider.getChildren()[0];
};

const getFirstEnvIconPath = () => getFirstEnvironment().iconPath;
const getFirstEnvStatus = () => getFirstEnvironment().status;

const activeEnvironmentIconPath = "favicon-16x16.png";
const inProgressIconPath = "in_progress.png";
const waitingForUserIconPath = "waiting_for_user.png";

suite("environment actions", function () {
  this.timeout(1000 * 10);
  afterEach(async () => {
    sinon.restore();
    await logout();
    await extension._reset();
  });

  suite("redeploy", () => {
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

      vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());
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
      vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());

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
      vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());

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
      vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());
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

  suite("approval flow", () => {
    test("should show waiting for user status and icon when env waiting for user", async () => {
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

      vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());

      const waitingForUserEnvironment: EnvironmentModel = {
        ...environmentMock,
        status: "WAITING_FOR_USER",
        updatedAt: Date.now().toString(),
      };
      mockGetEnvironment(orgId, [waitingForUserEnvironment], auth);
      await waitFor(() =>
        expect(getFirstEnvIconPath()).toContain(waitingForUserIconPath)
      );
      expect(getFirstEnvStatus()).toBe("WAITING_FOR_USER");
    });

    test("should show waiting for user notification when deployment waiting for user", async () => {
      const assertShowWarningMessageCalled = stubShowMessage(
        MessageType.WARNING
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

      vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());

      const waitingForUserEnvironment: EnvironmentModel = {
        ...environmentMock,
        status: "WAITING_FOR_USER",
        updatedAt: Date.now().toString(),
      };

      mockGetEnvironment(orgId, [waitingForUserEnvironment], auth);
      await assertShowWarningMessageCalled(
        `Environment ${envName} is waiting for approval`,
        environmentMock.projectId,
        environmentMock.id
      );
    });

    test("should approve when user approve", async () => {
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

      vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());

      const waitingForUserEnvironment: EnvironmentModel = {
        ...environmentMock,
        status: "WAITING_FOR_USER",
        updatedAt: Date.now().toString(),
      };
      mockGetEnvironment(orgId, [waitingForUserEnvironment], auth);
      await waitFor(() =>
        expect(getFirstEnvIconPath()).toContain(waitingForUserIconPath)
      );
      const onApprove = jestMock.fn();
      mockApprove(
        waitingForUserEnvironment.latestDeploymentLog.id,
        auth,
        onApprove
      );
      vscode.commands.executeCommand("env0.approve", getFirstEnvironment());
      await waitFor(() => expect(onApprove).toHaveBeenCalled());
    });

    test("should cancel when user cancel", async () => {
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

      vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());

      const waitingForUserEnvironment: EnvironmentModel = {
        ...environmentMock,
        status: "WAITING_FOR_USER",
        updatedAt: Date.now().toString(),
      };
      mockGetEnvironment(orgId, [waitingForUserEnvironment], auth);
      await waitFor(() =>
        expect(getFirstEnvIconPath()).toContain(waitingForUserIconPath)
      );
      const onCancel = jestMock.fn();
      mockCancel(
        waitingForUserEnvironment.latestDeploymentLog.id,
        auth,
        onCancel
      );
      vscode.commands.executeCommand("env0.cancel", getFirstEnvironment());
      await waitFor(() => expect(onCancel).toHaveBeenCalled());
    });
  });
});
