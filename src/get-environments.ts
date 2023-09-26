import { getGitRepoAndBranch } from "./utils/git";
import { apiClient } from "./api-client";
import { extensionState } from "./extension-state";

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

  environments = await apiClient.getEnvironments();

  if (environments.length > 0) {
    const { currentBranch, repository } = getGitRepoAndBranch();
    if (!currentBranch || !repository) {
      extensionState.onFailedToGetBranch();
      return [];
    } else {
      extensionState.setCurrentBranch(currentBranch);
    }
    environments = environments.filter(
      (environment) =>
        repositoriesEqual(
          environment?.latestDeploymentLog?.blueprintRepository,
          repository
        ) &&
        environment?.latestDeploymentLog?.blueprintRevision === currentBranch
    );
  }
  return environments;
}
