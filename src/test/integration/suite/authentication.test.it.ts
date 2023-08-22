import { mockGitRepoAndBranch } from "../mocks/git";
import {
  mockGetDeploymentStepsApiResponse,
  mockGetEnvironment,
  mockGetOrganization,
  mockRedeployApiResponse,
} from "../mocks/server";
import {
  getEnvironmentMock,
  getEnvironmentsView,
  getFirstEnvStatus,
  getFirstEnvironment,
  login,
  logout,
  resetExtension,
  waitFor,
} from "./test-utils";
import * as jestMock from "jest-mock";
import * as vscode from "vscode";
import expect from "expect";
import { afterEach, beforeEach } from "mocha";

const orgId = "org-id";
const envName = "my env";
const auth = { keyId: "key-id", secret: "key-secret" };
const environmentMock = getEnvironmentMock(
  "main",
  "https://github.com/user/repo",
  {
    name: envName,
  }
);

suite("authentication", function () {
  this.timeout(1000 * 10);
  beforeEach(async () => {
    mockGetOrganization(orgId, auth);
    mockGetEnvironment(orgId, [environmentMock], auth);
    mockGitRepoAndBranch("main", "git@github.com:user/repo.git");
    mockGetDeploymentStepsApiResponse();

    await login(auth);
    await waitFor(() => expect(getFirstEnvStatus()).toContain("ACTIVE"));
  });

  afterEach(async () => {
    await logout();
    await resetExtension();
  });

  test("should call redeploy with the credentials provided on login", async () => {
    const onRedeployCalled = jestMock.fn();
    mockRedeployApiResponse(environmentMock.id, auth, onRedeployCalled);

    vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());
    await waitFor(() => expect(onRedeployCalled).toHaveBeenCalled());
  });

  test("should call redeploy with updated credentials when logout and login again ", async () => {
    await logout();
    const newAuthData = {
      keyId: "different-key-id",
      secret: "different-key-secret",
    };
    mockGetOrganization(orgId, newAuthData);
    mockGetEnvironment(orgId, [environmentMock], newAuthData);

    await login(newAuthData);
    await waitFor(() => expect(getFirstEnvStatus()).toContain("ACTIVE"));
    const onRedeployCalled = jestMock.fn();
    mockRedeployApiResponse(environmentMock.id, newAuthData, onRedeployCalled);

    vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());
    await waitFor(() => expect(onRedeployCalled).toHaveBeenCalled());
  });

  test("should show login message when logout", async () => {
    await logout();
    await waitFor(() =>
      expect(getEnvironmentsView().message).toContain(
        "you are logged out. in order to log in, run the command 'env0.login'"
      )
    );
  });
});
