import axios, { AxiosResponse } from "axios";
import * as vscode from "vscode";

const ENV0_BASE_URL = "api-dev.dev.env0.com";
const DOT_GIT_SUFFIX_LENGTH = 4;
export type EnvironmentModel = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  latestDeploymentLog: {
    blueprintRepository: string;
    blueprintRevision: string;
  };
}; // TODO: change to real Environment Model

export async function getEnvironmentsForBranch() {
  // get env0 api key & secret
  const API_KEY = "r0ryce5qq4ddi5lk";
  const API_SECRET = "Sw5Y0mCjqIh3dG_atSIQFmLaADQK-964";

  let environments: EnvironmentModel[] = [];

  const organizationId = await getOrganizationId(API_KEY, API_SECRET);

  if (organizationId) {
    environments = await getEnvironments(API_KEY, API_SECRET, organizationId);
  }

  if (environments.length > 0) {
    const { currentBranch, repository } = getGitData();
    environments = environments.filter(
      (environment) =>
        environment?.latestDeploymentLog?.blueprintRepository === repository &&
        environment?.latestDeploymentLog?.blueprintRevision === currentBranch
    );
  }

  return environments;
}

async function getEnvironments(
  apiKey: string,
  apiSecret: string,
  organizationId: string
) {
  let environments: EnvironmentModel[] = [];

  try {
    const environments = (
      await axios.get<EnvironmentModel[]>(
        `https://${ENV0_BASE_URL}/environments`,
        {
          params: { organizationId: organizationId },
          auth: {
            username: apiKey,
            password: apiSecret,
          },
        }
      )
    ).data;

    return environments;
  } catch (e) {
    console.log(e);
  }

  return [];
}

async function getOrganizationId(apiKey: string, apiSecret: string) {
  try {
    const organizationId = (
      await axios.get<{ id: string }[]>(
        `https://${ENV0_BASE_URL}/organizations`,
        {
          auth: {
            username: apiKey,
            password: apiSecret,
          },
        }
      )
    ).data[0]?.id;

    return organizationId;
  } catch (error) {
    console.log(error);
  }
}

function getGitData() {
  const extensions = vscode.extensions;
  let normalizedRepositoryName;
  let currentBranch;

  if (extensions) {
    const gitExtension = extensions.getExtension("vscode.git")?.exports;

    const api = gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (repository) {
      const head = repository.state.HEAD;
      currentBranch = head.name;
      const repositoryName = repository.repository.remotes[0].fetchUrl;
      normalizedRepositoryName = repositoryName?.slice(
        0,
        -DOT_GIT_SUFFIX_LENGTH
      );
    }
  }

  return { repository: normalizedRepositoryName, currentBranch };
}
