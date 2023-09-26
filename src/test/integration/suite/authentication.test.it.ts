import { mockGitRepoAndBranch } from "../mocks/git";
import {
  mockGetDeploymentStepsApiResponse,
  mockGetEnvironment,
  mockGetOrganizations,
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
import { afterEach } from "mocha";
import { resetSpyOnQuickPick, spyOnQuickPick } from "../mocks/quick-pick";

const envName = "my env";
const auth = { keyId: "key-id", secret: "key-secret" };
const environmentMock = getEnvironmentMock(
  "main",
  "https://github.com/user/repo",
  {
    name: envName,
  }
);
const selectedOrg = { name: "my org", id: "org-id" };
const initMocksAndLogin = async (moreOrgs: typeof selectedOrg[] = []) => {
  mockGetOrganizations([selectedOrg, ...moreOrgs], auth);
  mockGetEnvironment(selectedOrg.id, [environmentMock], auth);
  mockGitRepoAndBranch("main", "git@github.com:user/repo.git");
  mockGetDeploymentStepsApiResponse();
  await login(auth);

  await waitFor(() => expect(getFirstEnvStatus()).toContain("ACTIVE"));
};

suite("authentication", function () {
  this.timeout(1000 * 10);

  afterEach(async () => {
    await logout();
    await resetExtension();
    resetSpyOnQuickPick();
  });

  test("should call redeploy with the credentials provided on login", async () => {
    await initMocksAndLogin();
    const onRedeployCalled = jestMock.fn();
    mockRedeployApiResponse(environmentMock.id, auth, onRedeployCalled);

    vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());
    await waitFor(() => expect(onRedeployCalled).toHaveBeenCalled());
  });

  test("should call redeploy with updated credentials when logout and login again ", async () => {
    await initMocksAndLogin();
    await logout();
    const newAuthData = {
      keyId: "different-key-id",
      secret: "different-key-secret",
    };
    mockGetOrganizations([selectedOrg], newAuthData);
    mockGetEnvironment(selectedOrg.id, [environmentMock], newAuthData);

    await login(newAuthData);
    await waitFor(() => expect(getFirstEnvStatus()).toContain("ACTIVE"));
    const onRedeployCalled = jestMock.fn();
    mockRedeployApiResponse(environmentMock.id, newAuthData, onRedeployCalled);

    vscode.commands.executeCommand("env0.redeploy", getFirstEnvironment());
    await waitFor(() => expect(onRedeployCalled).toHaveBeenCalled());
  });

  test("should show login message when logout", async () => {
    await initMocksAndLogin();
    await logout();
    await waitFor(() =>
      expect(getEnvironmentsView().message).toContain(
        "you are logged out. in order to log in, run the command 'env0.login'"
      )
    );
  });

  test("should show pick organization message when login", async () => {
    const onQuickPick = spyOnQuickPick();

    const secondOrg = { name: "second org", id: "second-org-id" };
    initMocksAndLogin([secondOrg]);
    await waitFor(() =>
      expect(onQuickPick).toHaveBeenCalledWith(
        [selectedOrg, secondOrg].map((org) => ({
          label: org.name,
          description: org.id,
        })),
        {
          placeHolder: "Select an organization",
        }
      )
    );
  });

  test("should show environments for the selected org", async () => {
    const secondOrg = { name: "second org", id: "second-org-id" };
    const onQuickPick = spyOnQuickPick();
    onQuickPick.mockImplementationOnce(() =>
      Promise.resolve({ label: secondOrg.name, description: secondOrg.id })
    );
    mockGetOrganizations([selectedOrg, secondOrg], auth);
    mockGetEnvironment(secondOrg.id, [environmentMock], auth);
    mockGitRepoAndBranch("main", "git@github.com:user/repo.git");
    mockGetDeploymentStepsApiResponse();
    await login(auth);

    await waitFor(() =>
      expect(getFirstEnvironment().name).toBe(environmentMock.name)
    );
  });
});
