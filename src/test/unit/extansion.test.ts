import {
  Env0EnvironmentsProvider,
  Environment,
} from "../../env0-environments-provider";
import * as myExtension from "../../extension";
import type vscode from "vscode";
describe("loading message", () => {
  it("should show loading message", async () => {
    const environmentsDataProvider = {} as Env0EnvironmentsProvider;
    const environmentsTree = {} as vscode.TreeView<Environment>;
    await myExtension.loadEnvironments(
      environmentsDataProvider,
      environmentsTree
    );
  });
});
