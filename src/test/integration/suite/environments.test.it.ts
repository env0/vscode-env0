import { mockGetEnvironment, mockGetOrganization } from "../mocks/server";
import { mockGitRepoAndBranch } from "../mocks/git";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as extension from "../../../../dist/extension.js";
import { Env0EnvironmentsProvider } from "../../../env0-environments-provider";
import { getEnvironmentMock, login, logout, waitFor } from "./test-utils";
import { afterEach } from "mocha";
import sinon from "sinon";
import { EnvironmentModel } from "../../../get-environments";
import expect from "expect";

const auth = { keyId: "key-id", secret: "key-secret" };
const orgId = "org-id";
const initTest = async (environments: EnvironmentModel[]) => {
  mockGetOrganization(orgId, auth);
  mockGetEnvironment(orgId, environments, auth);
  mockGitRepoAndBranch("main", "git@github.com:user/repo.git");
  await login(auth);
};

suite("environments", function () {
  this.timeout(1000 * 10);
  afterEach(async () => {
    sinon.restore();
    await logout();
    await extension._reset();
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
      expect(environments[0].iconPath).toContain("favicon-16x16.png");
    });
  });

  test("should not show inactive environments", async () => {
    const activeEnvName = "active env";
    const inactiveEnvName = "inactive env";
    const environments = [
      getEnvironmentMock("main", "https://github.com/user/repo", {
        name: activeEnvName,
      }),
      getEnvironmentMock("main", "https://github.com/user/repo", {
        status: "INACTIVE",
        name: inactiveEnvName,
      }),
    ];
    await initTest(environments);

    const environmentsDataProvider =
      extension.environmentsDataProvider as Env0EnvironmentsProvider;

    await waitFor(() => {
      const environments = environmentsDataProvider.getChildren();
      expect(environments).toHaveLength(1);
      expect(environments[0].label).toBe(activeEnvName);
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
});
