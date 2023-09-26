import * as vscode from "vscode";
import * as jestMock from "jest-mock";

export const mockGitRepoAndBranch = (branchName?: string, repoUrl?: string) => {
  const gitExtensionMock = {
    getAPI: jestMock.fn().mockReturnValue({
      repositories: [
        {
          state: {
            HEAD: {
              name: branchName,
            },
          },
          rootUri: {
            fsPath: "test",
          },
          repository: {
            remotes: [
              {
                fetchUrl: repoUrl,
              },
            ],
          },
        },
      ],
    }),
  };

  const getExtensionMock = jestMock.spyOn(vscode.extensions, "getExtension");
  getExtensionMock.mockImplementation((arg) => {
    if (arg === "vscode.git") {
      return { exports: gitExtensionMock } as vscode.Extension<unknown>;
    }
    return {} as vscode.Extension<unknown>;
  });
};

export const mockNoGitRepo = () => {
  mockGitRepoAndBranch(undefined, undefined);
};
