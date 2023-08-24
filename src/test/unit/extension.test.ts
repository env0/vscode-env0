import {
  Env0EnvironmentsProvider,
  Environment,
} from "../../env0-environments-provider";
import * as myExtension from "../../extension";
import type vscode from "vscode";
import { getCurrentBranchWithRetry } from "../../utils/git";
jest.mock("../../utils/git");

const mockGetCurrentBranchWithRetry = (branchName: string) => {
  const getCurrentBranchWithRetryPromise = Promise.resolve(branchName);
  (getCurrentBranchWithRetry as jest.Mock).mockImplementation(
    () => getCurrentBranchWithRetryPromise
  );
  return getCurrentBranchWithRetryPromise;
};

let environmentsDataProvider: Env0EnvironmentsProvider;
let environmentsTree: vscode.TreeView<Environment>;
const branchName = "my-branch";

describe("extension", () => {
  beforeEach(() => {
    environmentsDataProvider = {
      refresh: jest.fn(),
    } as unknown as Env0EnvironmentsProvider;

    environmentsTree = {} as vscode.TreeView<Environment>;
  });
  describe("init", () => {
    it("should display simple loading message when branch name is yet to load", async () => {
      mockGetCurrentBranchWithRetry(branchName);
      const loadEnvironmentsPromise = myExtension.loadEnvironments(
        environmentsDataProvider
      );
      expect(environmentsTree.message).toBe("loading environments...");
      await loadEnvironmentsPromise;
    });

    it("should display 'loading from branch' message when branch name is loaded", async () => {
      const getCurrentBranchPromise = mockGetCurrentBranchWithRetry(branchName);
      const loadEnvironmentsPromise = myExtension.loadEnvironments(
        environmentsDataProvider
      );
      await getCurrentBranchPromise;
      expect(environmentsTree.message).toBe(
        `loading environments from branch ${branchName}...`
      );
      await loadEnvironmentsPromise;
    });

    it("should not display loading message when done fetching environments", async () => {
      mockGetCurrentBranchWithRetry(branchName);
      const loadEnvironmentsPromise = myExtension.loadEnvironments(
        environmentsDataProvider
      );
      await loadEnvironmentsPromise;
      expect(environmentsTree.message).toBe(undefined);
    });
  });
});
