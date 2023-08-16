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

const activeEnvironmentIconPath = "favicon-16x16.png";
const inProgressIconPath = "in_progress.png";

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

      assertShowInformationMessageCalled = stubShowMessage(
        MessageType.INFORMATION
      );

      await mockEnvironmentWithUpdatedStatus(
        inProgressEnvironment,
        EnvironmentStatus.ACTIVE
      );
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
});
