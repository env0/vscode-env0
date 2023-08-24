import { EnvironmentModel } from "../../../get-environments";
import { mockGitRepoAndBranch } from "../mocks/git";
import {
  getOutputChannelLogs,
  mockOutputChannel,
  outputChannelMock,
  resetOutputChannelMocks,
} from "../mocks/output-channel";
import {
  mockDeploymentLogsResponses,
  mockGetDeploymentApiResponse,
  mockGetEnvironment,
  mockGetOrganization,
} from "../mocks/server";
import {
  clickOnEnvironmentByName,
  clickOnFirstEnvironment,
  getEnvironmentMock,
  getFirstEnvStatus,
  login,
  logout,
  redeploy,
  resetExtension,
  waitFor,
} from "./test-utils";
import { afterEach, beforeEach } from "mocha";
import expect from "expect";
import { DeploymentStatus } from "../../../types";

const auth = { keyId: "key-id", secret: "key-secret" };
const orgId = "org-id";
const firstEnvName = "my env";
const secondEnvName = "my env 2";

let firstEnvironmentMock: EnvironmentModel;
let secondEnvironmentMock: EnvironmentModel;

suite("deployment logs", function () {
  this.timeout(1000 * 13);

  beforeEach(async () => {
    mockGitRepoAndBranch("main", "git@github.com:user/repo.git");
    firstEnvironmentMock = getEnvironmentMock(
      "main",
      "https://github.com/user/repo",
      {
        name: firstEnvName,
      }
    );
    secondEnvironmentMock = getEnvironmentMock(
      "main",
      "https://github.com/user/repo",
      {
        name: secondEnvName,
        id: "second-env-id",
        latestDeploymentLog: {
          ...firstEnvironmentMock.latestDeploymentLog,
          id: "second-deployment-id",
        },
      }
    );
    mockOutputChannel();
    await resetExtension(); // we need to resat because we are mocking the output channel
    const environments = [firstEnvironmentMock, secondEnvironmentMock];
    mockGetOrganization(orgId, auth);
    mockGetEnvironment(orgId, environments, auth);
    await login(auth);
    await waitFor(() => expect(getFirstEnvStatus()).toBe("ACTIVE"));
  });

  afterEach(async () => {
    await logout();
    await resetExtension();
    resetOutputChannelMocks();
  });

  test("should show deployment logs when click on environment", async () => {
    const steps = {
      "git:clone": ["Cloning into 'repo'...", "Clone done"],
      "state:get": ["Retrieving persisted state for environment..."],
    };
    mockDeploymentLogsResponses(
      firstEnvironmentMock.latestDeploymentLog.id,
      auth,
      steps
    );
    await clickOnFirstEnvironment();

    await waitFor(() => expect(outputChannelMock.show).toHaveBeenCalled());
    await waitFor(() =>
      expect(getOutputChannelLogs()).toEqual(
        expect.arrayContaining([
          "Loading logs...",
          "$$$ git:clone",
          "Cloning into 'repo'...",
          "Clone done",
          "$$$ state:get",
          "Retrieving persisted state for environment...",
        ])
      )
    );
  });

  test("should clear log channel when switch between selected environments", async () => {
    const steps = {
      "git:clone": ["Cloning into 'repo'...", "Clone done"],
      "state:get": ["Retrieving persisted state for environment..."],
    };
    mockDeploymentLogsResponses(
      firstEnvironmentMock.latestDeploymentLog.id,
      auth,
      steps
    );
    await clickOnEnvironmentByName(firstEnvName);
    await waitFor(() => expect(outputChannelMock.show).toHaveBeenCalled());
    resetOutputChannelMocks();
    await clickOnEnvironmentByName(secondEnvName);
    await waitFor(() => expect(outputChannelMock.show).toHaveBeenCalled());
    await waitFor(() => expect(outputChannelMock.clear).toHaveBeenCalled());
  });

  test("should show deployment logs when redeploy", async () => {
    const steps = {
      "git:clone": ["Cloning into 'repo'...", "Clone done"],
      "state:get": ["Retrieving persisted state for environment..."],
    };
    const newDeploymentId = "my-new-deployment-id";
    mockDeploymentLogsResponses(
      newDeploymentId,
      auth,
      steps,
      DeploymentStatus.IN_PROGRESS
    );
    await redeploy({
      environment: firstEnvironmentMock,
      auth,
      orgId,
      newDeploymentId,
    });
    await waitFor(() => expect(outputChannelMock.show).toHaveBeenCalled());
    await waitFor(() =>
      expect(getOutputChannelLogs()).toEqual(
        expect.arrayContaining([
          "Loading logs...",
          "$$$ git:clone",
          "Cloning into 'repo'...",
          "Clone done",
          "$$$ state:get",
          "Retrieving persisted state for environment...",
        ])
      )
    );
  });

  test("should log deployment queued when deployment queued", async () => {
    const steps = {
      "git:clone": ["Cloning into 'repo'...", "Clone done"],
      "state:get": ["Retrieving persisted state for environment..."],
    };
    const newDeploymentId = "my-new-deployment-id";
    mockGetDeploymentApiResponse(newDeploymentId, auth, {
      status: DeploymentStatus.QUEUED,
    });
    await redeploy({
      environment: firstEnvironmentMock,
      auth,
      orgId,
      newDeploymentId,
    });
    await waitFor(() => expect(outputChannelMock.show).toHaveBeenCalled());
    await waitFor(() =>
      expect(getOutputChannelLogs()).toEqual(
        expect.arrayContaining([
          "Deployment is queued! Waiting for it to start...",
        ])
      )
    );

    mockDeploymentLogsResponses(
      newDeploymentId,
      auth,
      steps,
      DeploymentStatus.IN_PROGRESS
    );

    await waitFor(
      () =>
        expect(getOutputChannelLogs()).toEqual(
          expect.arrayContaining([
            "Loading logs...",
            "$$$ git:clone",
            "Cloning into 'repo'...",
            "Clone done",
            "$$$ state:get",
            "Retrieving persisted state for environment...",
          ])
        ),
      10
    );
  });
});
