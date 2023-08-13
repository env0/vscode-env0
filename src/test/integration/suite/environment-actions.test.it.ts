import { getEnvironmentMock, login, logout, waitFor } from "./test-utils";
// @ts-ignore
import * as extension from "../../../../dist/extension.js";
import sinon from "sinon";
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

const auth = { keyId: "key-id", secret: "key-secret" };
const orgId = "org-id";
const initTest = async (environments: EnvironmentModel[]) => {
  mockGetOrganization(orgId, auth);
  mockGetEnvironment(orgId, environments, auth);
  mockGitRepoAndBranch("main", "git@github.com:user/repo.git");
  mockGetDeploymentSteps();
  await login(auth);
};

const stubShowInformationMessage = () => {
  return sinon.stub(vscode.window, "showInformationMessage").resolves();
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

    await waitFor(() =>
      expect(getFirstEnvIconPath()).toContain(activeEnvironmentIconPath)
    );
    const onRedeployCalled = sinon.spy();
    mockRedeploy(environmentMock.id, auth, onRedeployCalled);

    vscode.commands.executeCommand("env0.redeploy", environmentMock);
    await waitFor(() => expect(onRedeployCalled.callCount).toBe(1));
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
    await waitFor(() =>
      expect(getFirstEnvIconPath()).toContain(activeEnvironmentIconPath)
    );
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
    const showInformationMessageStub = stubShowInformationMessage();

    const envName = "my env";
    const environmentMock = getEnvironmentMock(
      "main",
      "https://github.com/user/repo",
      {
        name: envName,
      }
    );

    await initTest([environmentMock]);
    await waitFor(() =>
      expect(getFirstEnvIconPath()).toContain(activeEnvironmentIconPath)
    );
    mockRedeploy(environmentMock.id, auth);
    vscode.commands.executeCommand("env0.redeploy", environmentMock);

    const inProgressEnvironment: EnvironmentModel = {
      ...environmentMock,
      status: "DEPLOY_IN_PROGRESS",
      updatedAt: Date.now().toString(),
    };
    mockGetEnvironment(orgId, [inProgressEnvironment], auth);

    await waitFor(() => expect(showInformationMessageStub.callCount).toBe(1));

    const successfullyDeployedEnvironment: EnvironmentModel = {
      ...inProgressEnvironment,
      status: "ACTIVE",
      updatedAt: Date.now().toString(),
    };

    mockGetEnvironment(orgId, [successfullyDeployedEnvironment], auth);
    await waitFor(() => expect(showInformationMessageStub.callCount).toBe(2));
  });
});
