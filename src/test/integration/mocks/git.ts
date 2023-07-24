import * as vscode from "vscode";
import sinon from "sinon";

export const mockGitRepoAndBranch = (branchName: string, repoUrl: string) => {
  const gitExtensionMock = {
    getAPI: sinon.stub().returns({
      repositories: [
        {
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
  };

  const getExtensionStub = sinon.stub(vscode.extensions, "getExtension");
  getExtensionStub
    .withArgs("vscode.git")
    .returns({ exports: gitExtensionMock } as any);
};
