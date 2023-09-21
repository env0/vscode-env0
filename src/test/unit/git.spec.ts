// vscode and git mocks must be imported before the tested module!!!
import {
  mockGitRemoteShowOrigin,
  mockGitVscodeExtension,
  resetGitMocks,
} from "./mocks/git";
// stir-ansi mock must be imported before the tested module!!!
import "./mocks/strip-ansi";
import { resetVscodeMocks } from "./mocks/vscode";
import expect from "expect";
import { getGitRepoAndBranch } from "../../utils/git";

describe("git", () => {
  afterEach(() => {
    resetVscodeMocks();
    resetGitMocks();
  });

  it("should return current branch ", async () => {
    const currentBranchName = "test";
    const gitPath = "/test";
    const repoUrl = "git@github.com:test/test.git";

    mockGitVscodeExtension(gitPath, currentBranchName, repoUrl);

    const result = await getGitRepoAndBranch();
    expect(result).toEqual({
      currentBranch: currentBranchName,
      repository: "git@github.com:test/test",
      isDefaultBranch: false,
    });
  });

  it("should return is default true when default branch ", async () => {
    const currentBranchName = "test";
    const gitPath = "/test";
    const repoUrl = "git@github.com:test/test.git";

    mockGitVscodeExtension(gitPath, currentBranchName, repoUrl);
    mockGitRemoteShowOrigin(currentBranchName);

    const result = await getGitRepoAndBranch();
    expect(result).toEqual({
      currentBranch: currentBranchName,
      repository: "git@github.com:test/test",
      isDefaultBranch: true,
    });
  });

  it("should return is default false when current branch is not the default branch ", async () => {
    const currentBranchName = "test";
    const gitPath = "/test";
    const repoUrl = "git@github.com:test/test.git";

    mockGitVscodeExtension(gitPath, currentBranchName, repoUrl);
    mockGitRemoteShowOrigin("master");

    const result = await getGitRepoAndBranch();
    expect(result).toEqual({
      currentBranch: currentBranchName,
      repository: "git@github.com:test/test",
      isDefaultBranch: false,
    });
  });
});
