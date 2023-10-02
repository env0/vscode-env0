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
};

export type Project = any; // TODO: change to real Project Model

// Extracts the prefix from http or ssh repositories.
const repositoryPrefixRegex = /.*[:/]([^/]+\/[^/]+)/;

// Compares repositories irrespective if they're https or ssh.
export function repositoriesEqual(rep1: string, rep2: string): boolean {
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

  // get all projects
  const projects: Project[] = await apiClient.getUserProjects();
  console.log("projects", projects);
  environments = (
    await Promise.all(
      projects
        .filter((project) => !project.isArchived)
        .map(async (project: Project) => apiClient.getEnvironments(project.id))
    )
  ).flat();
  // get all environments of all projects

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
