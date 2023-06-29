import axios from "axios";
import * as vscode from "vscode";
import { getApiKeyCredentials } from "./auth";
import { ENV0_API_URL } from "./common";
import { getGitData } from "./utils/git";

export type EnvironmentModel = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  projectId: string;
  latestDeploymentLog: {
    id: string;
    blueprintRepository: string;
    blueprintRevision: string;
    error?: {
      message?: string;
    };
  };
}; // TODO: change to real Environment Model

// Extracts the prefix from http or ssh repositories.
const repositoryPrefixRegex = /.*[:/]([^/]+\/[^/]+)/;

// Compares repositories irrespective if they're https or ssh.
function repositoriesEqual(rep1: string, rep2: string): boolean {
  const res1 = repositoryPrefixRegex.exec(rep1);
  const res2 = repositoryPrefixRegex.exec(rep2);

  return (
    !!res1 &&
    !!res2 &&
    res1.length === 2 &&
    res2.length === 2 &&
    res1[1] === res2[1]
  );
}

export async function getEnvironmentsForBranch() {
  const apiKeyCredentials = getApiKeyCredentials();

  let environments: EnvironmentModel[] = [];

  const organizationId = await getOrganizationId(apiKeyCredentials);

  if (organizationId) {
    environments = await getEnvironments(apiKeyCredentials, organizationId);
  }

  if (environments.length > 0) {
    const { currentBranch, repository } = getGitData();
    environments = environments
      .filter(
        (environment) =>
          repositoriesEqual(
            environment?.latestDeploymentLog?.blueprintRepository,
            repository
          ) &&
          environment?.latestDeploymentLog?.blueprintRevision === currentBranch
      )
      .filter((environment) => environment.status !== "INACTIVE");
  }

  return environments;
}

async function getEnvironments(
  apiKeyCredentials: { username: string; password: string },
  organizationId: string
) {
  try {
    const environments = (
      await axios.get<EnvironmentModel[]>(
        `https://${ENV0_API_URL}/environments`,
        {
          params: { organizationId },
          auth: apiKeyCredentials,
        }
      )
    ).data;

    return environments;
  } catch (e) {
    console.log(e);
  }

  return [];
}

async function getOrganizationId(apiKeyCredentials: {
  username: string;
  password: string;
}) {
  const organizationId = (
    await axios.get<{ id: string }[]>(`https://${ENV0_API_URL}/organizations`, {
      auth: apiKeyCredentials,
    })
  ).data[0]?.id;

  return organizationId;
}
