import { mockGetEnvironment, mockGetOrganizations } from "../mocks/server";
import { mockGitRepoAndBranch, mockNoGitRepo } from "../mocks/git";
// @ts-ignore
import * as extension from "../../../../dist/extension.js";
import { Env0EnvironmentsProvider } from "../../../env0-environments-provider";
import {
  getEnvironmentMock,
  getEnvironmentViewMessage,
  login,
  logout,
  resetExtension,
  waitFor,
} from "./test-utils";
import { afterEach } from "mocha";
import { EnvironmentModel } from "../../../get-environments";
import expect from "expect";

const auth = { keyId: "key-id", secret: "key-secret" };
const organization = { name: "my org", id: "org-id" };

const initTest = async (environments: EnvironmentModel[]) => {
  mockGetOrganizations([organization], auth);
  mockGetEnvironment(organization.id, environments, auth);
  mockGitRepoAndBranch("main", "git@github.com:user/repo.git");
  await login(auth);
};

suite("environments", function () {
  this.timeout(1000 * 15);
  afterEach(async () => {
    await logout();
    await resetExtension();
  });
  test("should show active environment", async () => {
    const envName = "my env";
    const environments = [
      getEnvironmentMock("main", "https://github.com/user/repo", {
        name: envName,
      }),
    ];
    await initTest(environments);
    const environmentsDataProvider =
      extension.environmentsDataProvider as Env0EnvironmentsProvider;

    await waitFor(() => {
      const environments = environmentsDataProvider.getChildren();
      expect(environments).toHaveLength(1);
      expect(environments[0].label).toBe(envName);
      expect(environments[0].iconPath).toContain("favicon-32x32.png");
    });
  });

  test("should show environments only for the current repo", async () => {
    const envName = "active env";
    const differentRepoEnvName = "different repo env";
    const environments = [
      getEnvironmentMock("main", "https://github.com/user/repo", {
        name: envName,
      }),
      getEnvironmentMock("main", "https://github.com/user/different-repo", {
        name: differentRepoEnvName,
      }),
    ];
    await initTest(environments);

    const environmentsDataProvider =
      extension.environmentsDataProvider as Env0EnvironmentsProvider;

    await waitFor(() => {
      const environments = environmentsDataProvider.getChildren();
      expect(environments).toHaveLength(1);
      expect(environments[0].label).toBe(envName);
    });
  });

  test("should show loading environments message", async () => {
    const envName = "my env";
    const environments = [
      getEnvironmentMock("main", "https://github.com/user/repo", {
        name: envName,
      }),
    ];
    mockNoGitRepo();
    mockGetOrganizations([organization], auth);
    // we don't await on login because we want to test the loading message
    login(auth);
    await waitFor(
      () => expect(getEnvironmentViewMessage()).toBe("loading environments..."),
      10
    );
    mockGitRepoAndBranch("main", "git@github.com:user/repo.git");
    mockGetEnvironment(organization.id, environments, auth, 2000);
    await waitFor(() =>
      expect(getEnvironmentViewMessage()).toBe(
        "loading environments for branch main..."
      )
    );
    await waitFor(() => expect(getEnvironmentViewMessage()).toBe(undefined));
  });

  test("should show could not find git branch message", async () => {
    mockNoGitRepo();
    mockGetOrganizations([organization], auth);
    await login(auth);
    await waitFor(() =>
      expect(getEnvironmentViewMessage()).toBe(
        "Could not find current git branch."
      )
    );
  });

  test("should show no environments message", async () => {
    await initTest([]);
    await waitFor(() =>
      expect(getEnvironmentViewMessage()).toBe(
        `couldn’t find environments associated with current branch "main" Note: This view displays only environments specifically associated with the current working branch. Environments created without specifying a branch (automatically associating them with the default branch) are not displayed, even if your current branch is the default one.`
      )
    );
  });
});
