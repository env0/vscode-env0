import * as assert from "assert";
import { mockGetEnvironment, mockGetOrganization } from "../mocks/server";
import { mockGitRepoAndBranch } from "../mocks/git";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as extension from "../../../../dist/extension.js";
import { Env0EnvironmentsProvider } from "../../../env0-environments-provider";
import { getEnvironmentMock, login, logout, waitFor } from "./test-utils";
import { afterEach } from "mocha";
import sinon from "sinon";

suite("init", () => {
  afterEach(async () => {
    sinon.restore();
    await logout();
  });

  test("should show environments", async () => {
    const auth = { keyId: "key-id", secret: "key-secret" };

    const orgId = "org-id";
    const envName = "my env";
    const environments = [
      getEnvironmentMock("main", "https://github.com/user/repo", {
        name: envName,
      }),
    ];
    mockGetOrganization(orgId, auth);
    mockGetEnvironment(orgId, environments, auth);
    mockGitRepoAndBranch("main", "git@github.com:user/repo.git");

    await login(auth);

    const environmentsDataProvider =
      extension.environmentsDataProvider as Env0EnvironmentsProvider;

    await waitFor(() => {
      const environments = environmentsDataProvider.getChildren();
      assert.strictEqual(environments.length, 1);
      assert.strictEqual(environments[0].label, envName);
    });
  });

  test("should not show inactive environments", async () => {
    const auth = { keyId: "key-id2", secret: "key-secret2" };

    const orgId = "org-id";
    const envName = "my env 2";
    const environments = [
      getEnvironmentMock("main", "https://github.com/user/repo", {
        name: envName,
      }),
      getEnvironmentMock("main", "https://github.com/user/repo", {
        status: "INACTIVE",
      }),
    ];
    mockGetOrganization(orgId, auth);
    mockGetEnvironment(orgId, environments, auth);
    mockGitRepoAndBranch("main", "git@github.com:user/repo.git");

    await login(auth);

    const environmentsDataProvider =
      extension.environmentsDataProvider as Env0EnvironmentsProvider;

    await waitFor(() => {
      const environments = environmentsDataProvider.getChildren();
      assert.strictEqual(environments.length, 1);
      assert.strictEqual(environments[0].label, envName);
    });
  });
});
