import mock from "mock-require";
import { ModuleMocker } from "jest-mock";
import { vscode } from "./vscode";
const mocker = new ModuleMocker(global);

export const simpleGitMock = mocker.fn();
mock("simple-git", simpleGitMock);

export const mockGitVscodeExtension = (
  gitPath: string,
  branchName: string,
  repoUrl: string
) => {
  vscode.extensions.getExtension = mocker.fn().mockReturnValue({
    exports: {
      getAPI: mocker.fn().mockReturnValue({
        repositories: [
          {
            rootUri: {
              fsPath: gitPath,
            },
            state: {
              HEAD: {
                name: branchName,
              },
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
    },
  });
};

export const mockGitRemoteShowOrigin = (HeadBranchName: string) => {
  simpleGitMock.mockReturnValue({
    checkIsRepo: mocker.fn<any>().mockResolvedValue(true),
    raw: mocker.fn<any>().mockResolvedValue(`HEAD branch: ${HeadBranchName}`),
  });
};

export const resetGitMocks = () => {
  simpleGitMock.mockReset();
};
