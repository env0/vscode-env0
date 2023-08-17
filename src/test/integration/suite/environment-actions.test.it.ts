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
  waitFor,
} from "./test-utils";
import {
  mockAbortApiResponse,
  mockDestroyApiResponse,
  mockGetDeploymentSteps,
  mockGetEnvironment,
  mockGetOrganization,
  mockRedeployApiResponse,
} from "../mocks/server";
import { mockGitRepoAndBranch } from "../mocks/git";
import { EnvironmentModel } from "../../../get-environments";
import { afterEach, beforeEach } from "mocha";
import expect from "expect";
import * as vscode from "vscode";
import * as jestMock from "jest-mock";
import { EnvironmentStatus } from "../../../types";
import {
  assertOpenEnvironmentInBrowserWhenMoreInfoClicked,
  assertErrorMessageDisplayed,
  assertInfoMessageDisplayed,
  simulateErrorMessageMoreInfoButtonClicked,
  simulateInfoMessageMoreInfoButtonClicked,
  resetOpenExternalSpy,
  resetShowMessageSpies,
  spyOnOpenExternal,
  spyOnShowMessage,
} from "../mocks/notification-message";

const auth = { keyId: "key-id", secret: "key-secret" };
const orgId = "org-id";

const initTest = async (environments: EnvironmentModel[]) => {
  mockGetOrganization(orgId, auth);
  mockGetEnvironment(orgId, environments, auth);
  mockGitRepoAndBranch("main", "git@github.com:user/repo.git");
  mockGetDeploymentSteps();
  spyOnShowMessage();
  spyOnOpenExternal();
  await login(auth);
  await waitFor(() =>
    expect(getFirstEnvIconPath()).toContain(activeEnvironmentIconPath)
  );
};

const mockEnvironmentWithUpdatedStatus = async (
  environment: EnvironmentModel,
  status: EnvironmentStatus
) => {
  const updatedEnvironment = {
    ...environment,
    status,
    updatedAt: Date.now().toString(),
  };
  mockGetEnvironment(orgId, [updatedEnvironment], auth);
  return updatedEnvironment;
};

const mockFailedEnvironment = async (
  environment: EnvironmentModel,
  errorMessage: string
) => {
  const failedEnvironment: EnvironmentModel = {
    ...environment,
    status: "FAILED",
    updatedAt: Date.now().toString(),
    latestDeploymentLog: {
      ...environment.latestDeploymentLog,
      error: { message: errorMessage },
    },
  };
  mockGetEnvironment(orgId, [failedEnvironment], auth);
};

const activeEnvironmentIconPath = "favicon-16x16.png";
const inProgressIconPath = "in_progress.png";
const inactiveIconPath = "inactive.png";
const failedIconPath = "failed.png";

const envName = "my env";
let environmentMock: EnvironmentModel;
suite("environment actions", function () {
  this.timeout(1000 * 10);

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
    await logout();
    await resetExtension();
    resetOpenExternalSpy();
    resetShowMessageSpies();
  });

  suite("redeploy", () => {
    test("should redeploy when user redeploy", async () => {
      await initTest([environmentMock]);

      const onRedeployCalled = jestMock.fn();
      mockRedeployApiResponse(environmentMock.id, auth, onRedeployCalled);

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

      await mockEnvironmentWithUpdatedStatus(
        inProgressEnvironment,
        EnvironmentStatus.ACTIVE
      );
      await waitFor(() =>
        expect(getFirstEnvIconPath()).toContain(activeEnvironmentIconPath)
      );
      expect(getFirstEnvStatus()).toBe("ACTIVE");
    });

    test("should show information message when redeploy", async () => {
      await initTest([environmentMock]);
      simulateInfoMessageMoreInfoButtonClicked();
      const inProgressEnvironment = await redeploy({
        environment: environmentMock,
        auth,
        orgId,
      });

      await assertInfoMessageDisplayed(
        `Environment ${envName} is in progress...`
      );

      await assertOpenEnvironmentInBrowserWhenMoreInfoClicked(
        inProgressEnvironment.id,
        inProgressEnvironment.projectId
      );

      resetShowMessageSpies(); // reset spies to not count the previous calls
      resetOpenExternalSpy(); // reset spies to not count the previous calls
      simulateInfoMessageMoreInfoButtonClicked();

      await mockEnvironmentWithUpdatedStatus(
        inProgressEnvironment,
        EnvironmentStatus.ACTIVE
      );

      await assertInfoMessageDisplayed(`Environment ${envName} is ACTIVE!`);

      await assertOpenEnvironmentInBrowserWhenMoreInfoClicked(
        inProgressEnvironment.id,
        inProgressEnvironment.projectId
      );
    });

    test("should show error message when redeploy fail", async () => {
      await initTest([environmentMock]);
      const inProgressEnvironment = await redeploy({
        environment: environmentMock,
        auth,
        orgId,
      });
      simulateErrorMessageMoreInfoButtonClicked();
      const errorMessage = "error message";
      await mockFailedEnvironment(inProgressEnvironment, errorMessage);

      await assertErrorMessageDisplayed(
        `Deployment has failed for environment ${envName}. Error: ${errorMessage}`
      );

      await assertOpenEnvironmentInBrowserWhenMoreInfoClicked(
        inProgressEnvironment.id,
        inProgressEnvironment.projectId
      );
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
      mockAbortApiResponse(
        inProgressEnvironment.latestDeploymentLog.id,
        auth,
        onAbort
      );
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

      mockAbortApiResponse(inProgressEnvironment.latestDeploymentLog.id, auth);
      vscode.commands.executeCommand("env0.abort", getFirstEnvironment());
      const abortingEnvironment = await mockEnvironmentWithUpdatedStatus(
        inProgressEnvironment,
        EnvironmentStatus.ABORTING
      );

      await waitFor(() =>
        expect(getFirstEnvIconPath()).toContain(inactiveIconPath)
      );
      expect(getFirstEnvStatus()).toBe("ABORTING");

      await mockEnvironmentWithUpdatedStatus(
        abortingEnvironment,
        EnvironmentStatus.ABORTED
      );
      await waitFor(() => expect(getFirstEnvStatus()).toBe("ABORTED"));
      expect(getFirstEnvIconPath()).toContain(failedIconPath);
    });
  });

  test("should destroy when user destroy", async () => {
    await initTest([environmentMock]);
    const onDestroy = jestMock.fn();
    mockDestroyApiResponse(environmentMock.id, auth, onDestroy);
    vscode.commands.executeCommand("env0.destroy", getFirstEnvironment());
    await waitFor(() => expect(onDestroy).toHaveBeenCalled());
  });
});
