import * as vscode from "vscode";
import retry from "async-retry";

const DOT_GIT_SUFFIX_LENGTH = 4;

export function getGitRepoAndBranch() {
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
      normalizedRepositoryName = repositoryName.endsWith(".git")
        ? repositoryName?.slice(0, -DOT_GIT_SUFFIX_LENGTH)
        : repositoryName;
    }
  }

  return { repository: normalizedRepositoryName, currentBranch };
}
export async function getCurrentBranchWithRetry() {
  return await retry(
    () => {
      const result = getGitRepoAndBranch();
      if (!result.currentBranch) {
        throw new Error("couldn't find git current branch");
      } else {
        return result.currentBranch;
      }
    },
    {
      factor: 1,
      minTimeout: 300,
      maxTimeout: 300,
      randomize: false,
      retries: 30,
    }
  );
}
