import * as vscode from "vscode";
import { Env0EnvironmentsProvider } from "./env0-environments-provider";
export function activate(context: vscode.ExtensionContext) {
  vscode.window.createTreeView("env0-environments", {
    treeDataProvider: new Env0EnvironmentsProvider("some-project-id"),
  });

  const configurationWorkspace = vscode.workspace.getConfiguration()
  const env0ApiKey: string | undefined = configurationWorkspace.get("env0.apiKeyId")
  console.log('apiKey is', env0ApiKey);
  
}

export function deactivate() {}
