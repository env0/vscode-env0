import * as vscode from "vscode";
import { Env0EnvironmentsProvider } from "./env0-environments-provider";
import { getEnvironmentsForBranch } from "./get-environments";

let environmentPollingInstance: NodeJS.Timer;

export function activate(context: vscode.ExtensionContext) {
  const environmentsDataProvider = new Env0EnvironmentsProvider();
  const tree = vscode.window.createTreeView("env0-environments", {
    treeDataProvider: environmentsDataProvider,
  });

  tree.onDidChangeSelection((e) => {
    const env = e.selection[0] ?? e.selection;

    // onClick here
  });

  vscode.commands.registerCommand("env0.openInEnv0", (env) => {
c    openEnvironmentInBrowser(env);
  });

  environmentPollingInstance = setInterval(async () => {
    const fetchedEnvironments = await getEnvironmentsForBranch();

    if (
      fetchedEnvironments &&
      environmentsDataProvider.shouldUpdate(fetchedEnvironments)
    ) {
      environmentsDataProvider.refresh();
    }
  }, 3000);
}

export function deactivate() {
  clearInterval(environmentPollingInstance);
}

const openEnvironmentInBrowser = ({ id, projectId }: any) => {
  vscode.env.openExternal(
    vscode.Uri.parse(
      `https://dev.dev.env0.com/p/${projectId}/environments/${id}`
    )
  );
};
