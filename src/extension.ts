import * as vscode from "vscode";
import { Env0EnvironmentsProvider } from "./env0-environments-provider";

export function activate(context: vscode.ExtensionContext) {
  const environmentsDataProvider = new Env0EnvironmentsProvider(
    "some-project-id"
  );
  vscode.window.createTreeView("env0-environments", {
    treeDataProvider: environmentsDataProvider,
  });

  setInterval(() => {
    environmentsDataProvider.refresh();
  }, 2000);
}

export function deactivate() {}
