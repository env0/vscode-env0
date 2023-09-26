import * as vscode from "vscode";
import retry from "async-retry";
import simpleGit, { SimpleGit } from "simple-git";
import {
  showCannotGetDefaultBranchMessage,
  showGetDefaultBranchError,
} from "../errors";

const DOT_GIT_SUFFIX_LENGTH = 4;

async function getDefaultBranch(repoPath: string): Promise<string | undefined> {
  try {
    const git: SimpleGit = simpleGit(repoPath);

    if (!(await git.checkIsRepo())) {
      return undefined;
    }

    const remoteShowOrigin: string = await git.raw([
      "remote",
      "show",
      "origin",
    ]);

    const defaultBranchMatch = remoteShowOrigin.match(/HEAD branch: (\S+)/);
    if (defaultBranchMatch && defaultBranchMatch.length > 1) {
      return defaultBranchMatch[1];
    }
  } catch (error: any) {
    showGetDefaultBranchError(error);
  }
  return undefined;
}

export async function getGitRepoAndBranch() {
  const extensions = vscode.extensions;
  let normalizedRepositoryName;
  let currentBranch;
  let isDefaultBranch = false;

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
      const defaultBranch = await getDefaultBranch(repository.rootUri.fsPath);
      if (!defaultBranch) {
        showCannotGetDefaultBranchMessage();
      } else {
        isDefaultBranch = currentBranch === defaultBranch;
      }
    }
  }

  return {
    repository: normalizedRepositoryName,
    currentBranch,
    isDefaultBranch,
  };
}
export async function getCurrentBranchWithRetry() {
  return await retry(
    async () => {
      const result = await getGitRepoAndBranch();
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
