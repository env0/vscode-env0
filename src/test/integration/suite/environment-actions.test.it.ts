import {
  MessageType,
  getEnvironmentMock,
  getFirstEnvIconPath,
  getFirstEnvStatus,
  getFirstEnvironment,
  login,
  logout,
  redeploy,
  resetExtension,
  stubShowMessage,
  waitFor,
} from "./test-utils";
import {
  mockAbort,
  mockApprove,
  mockCancel,
  mockDestroy,
  mockGetDeploymentSteps,
  mockGetEnvironment,
  mockGetOrganization,
  mockRedeploy,
} from "../mocks/server";
import { mockGitRepoAndBranch } from "../mocks/git";
import { EnvironmentModel } from "../../../get-environments";
import { afterEach, beforeEach } from "mocha";
import expect from "expect";
import * as vscode from "vscode";
import * as jestMock from "jest-mock";
import sinon from "sinon";
import { EnvironmentStatus } from "../../../types";

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

const activeEnvironmentIconPath = "favicon-16x16.png";
const inProgressIconPath = "in_progress.png";
const waitingForUserIconPath = "waiting_for_user.png";
const inactiveIconPath = "inactive.png";
const failedIconPath = "failed.png";

const envName = "my env";
let environmentMock = getEnvironmentMock(
  "main",
  "https://github.com/user/repo",
  {
    name: envName,
  }
);

suite("environment actions", function () {
  this.timeout(1000 * 10000);

  beforeEach(async () => {
    environmentMock = getEnvironmentMock(
      "main",
      "https://github.com/user/repo",
      {
        name: envName,
      }
    );
  });

  afterEach(async () => {
    sinon.restore();
    await logout();
    await resetExtension();
  });

  suite("redeploy", () => {
    test("should redeploy when user redeploy", async () => {
      await initTest([environmentMock]);

      const onRedeployCalled = jestMock.fn();
      mockRedeploy(environmentMock.id, auth, onRedeployCalled);

      vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());
      await waitFor(() => expect(onRedeployCalled).toHaveBeenCalled());
    });

    test("should update environment icon and status when redeploy", async () => {
      await initTest([environmentMock]);
      const inProgressEnvironment = await redeploy({
        environment: environmentMock,
        auth,
        orgId,
      });

      expect(getFirstEnvIconPath()).toContain(inProgressIconPath);
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

      await initTest([environmentMock]);
      const inProgressEnvironment = await redeploy({
        environment: environmentMock,
        auth,
        orgId,
      });

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

      await initTest([environmentMock]);
      const inProgressEnvironment = await redeploy({
        environment: environmentMock,
        auth,
        orgId,
      });

      const errorMessage = "some error";
      const failedEnvironment: EnvironmentModel = {
        ...inProgressEnvironment,
        status: "FAILED",
        updatedAt: Date.now().toString(),
        latestDeploymentLog: {
          ...inProgressEnvironment.latestDeploymentLog,
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
      await initTest([environmentMock]);
      const inProgressEnvironment = await redeploy({
        environment: environmentMock,
        auth,
        orgId,
      });

      const waitingForUserEnvironment: EnvironmentModel = {
        ...inProgressEnvironment,
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

      await initTest([environmentMock]);

      const inProgressEnvironment = await redeploy({
        environment: environmentMock,
        auth,
        orgId,
      });

      const waitingForUserEnvironment: EnvironmentModel = {
        ...inProgressEnvironment,
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
      await initTest([environmentMock]);

      const inProgressEnvironment = await redeploy({
        environment: environmentMock,
        auth,
        orgId,
      });
      const waitingForUserEnvironment: EnvironmentModel = {
        ...inProgressEnvironment,
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
      await initTest([environmentMock]);
      const inProgressEnvironment = await redeploy({
        environment: environmentMock,
        auth,
        orgId,
      });
      const waitingForUserEnvironment: EnvironmentModel = {
        ...inProgressEnvironment,
        status: EnvironmentStatus.WAITING_FOR_USER,
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

  suite("abort", () => {
    test("should abort when user abort", async () => {
      await initTest([environmentMock]);
      const inProgressEnvironment = await redeploy({
        environment: environmentMock,
        auth,
        orgId,
      });
      const onAbort = jestMock.fn();

      mockAbort(inProgressEnvironment.latestDeploymentLog.id, auth, onAbort);
      vscode.commands.executeCommand("env0.abort", getFirstEnvironment());

      await waitFor(() => expect(onAbort).toHaveBeenCalled());
    });

    test("should update environment status and icon when user abort deployment", async () => {
      await initTest([environmentMock]);
      const inProgressEnvironment = await redeploy({
        environment: environmentMock,
        auth,
        orgId,
      });

      mockAbort(inProgressEnvironment.latestDeploymentLog.id, auth);
      vscode.commands.executeCommand("env0.abort", getFirstEnvironment());
      const abortingEnvironment: EnvironmentModel = {
        ...inProgressEnvironment,
        status: EnvironmentStatus.ABORTING,
        updatedAt: Date.now().toString(),
      };
      mockGetEnvironment(orgId, [abortingEnvironment], auth);
      await waitFor(() =>
        expect(getFirstEnvIconPath()).toContain(inactiveIconPath)
      );
      expect(getFirstEnvStatus()).toBe("ABORTING");
      const abortedEnvironment: EnvironmentModel = {
        ...inProgressEnvironment,
        status: EnvironmentStatus.ABORTED,
        updatedAt: Date.now().toString(),
      };
      mockGetEnvironment(orgId, [abortedEnvironment], auth);
      await waitFor(() => expect(getFirstEnvStatus()).toBe("ABORTED"));
      expect(getFirstEnvIconPath()).toContain(failedIconPath);
    });
  });

  test("should destroy when user destroy", async () => {
    await initTest([environmentMock]);
    const onDestroy = jestMock.fn();

    mockDestroy(environmentMock.id, auth, onDestroy);

    vscode.commands.executeCommand("env0.destroy", getFirstEnvironment());

    await waitFor(() => expect(onDestroy).toHaveBeenCalled());
  });
});
