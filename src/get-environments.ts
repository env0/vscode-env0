import { getGitRepoAndBranch } from "./utils/git";
import { apiClient } from "./api-client";

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
  let environments: EnvironmentModel[] = [];

  const organizationId = await getOrganizationId();

  if (organizationId) {
    environments = await getEnvironments(organizationId);
  }

  if (environments.length > 0) {
    const { currentBranch, repository } = getGitRepoAndBranch();
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

async function getEnvironments(organizationId: string) {
  try {
    return apiClient.getEnvironments(organizationId);
  } catch (e) {
    console.log(e);
  }

  return [];
}

async function getOrganizationId() {
  const organizations = await apiClient.getOrganizations();
  return organizations[0]?.id;
}
