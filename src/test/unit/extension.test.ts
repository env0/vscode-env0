import {
  Env0EnvironmentsProvider,
  Environment,
} from "../../env0-environments-provider";
import * as myExtension from "../../extension";
import type vscode from "vscode";
import { getCurrentBranchWithRetry } from "../../utils/git";
jest.mock("../../utils/git");

const mockGetCurrentBranch = (branchName: string) => {
  const getCurrentBranchWithRetryPromise = Promise.resolve(branchName);
  (getCurrentBranchWithRetry as jest.Mock).mockImplementation(
    () => getCurrentBranchWithRetryPromise
  );
  return getCurrentBranchWithRetryPromise;
};

let environmentsDataProvider: Env0EnvironmentsProvider;
let environmentsTree: vscode.TreeView<Environment>;

describe("extension init", () => {
  beforeEach(() => {
    environmentsDataProvider = {
      refresh: jest.fn(),
    } as any as Env0EnvironmentsProvider;

    environmentsTree = {} as vscode.TreeView<Environment>;
  });

  it("should show loading message", async () => {
    const branchName = "my-branch";
    const getCurrentBranchPromise = mockGetCurrentBranch(branchName);

    const loadEnvironmentsPromise = myExtension.loadEnvironments(
      environmentsDataProvider,
      environmentsTree
    );
    expect(environmentsTree.message).toBe("loading environments...");
    await getCurrentBranchPromise;
    expect(environmentsTree.message).toBe(
      `loading environments from branch ${branchName}...`
    );
    await loadEnvironmentsPromise;
    expect(environmentsTree.message).toBe(undefined);
  });
});
