import * as vscode from "vscode";
import { Env0EnvironmentsProvider } from "./env0-environments-provider";
import { getEnvironmentsForBranch } from "./get-environments";
export async function activate(context: vscode.ExtensionContext) {
  vscode.window.createTreeView("env0-environments", {
    treeDataProvider: new Env0EnvironmentsProvider("some-project-id"),
  });

  await getEnvironmentsForBranch();
}

export function deactivate() {}
