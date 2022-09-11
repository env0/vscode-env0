import * as vscode from "vscode";
import { Env0EnvironmentsProvider } from "./env0-environments-provider";
import { getEnvironmentsForBranch} from './get-environments';

let environmentPollingInstance: NodeJS.Timer;

export function activate(context: vscode.ExtensionContext) {
  const environmentsDataProvider = new Env0EnvironmentsProvider(
    "some-project-id"
  );
  vscode.window.createTreeView("env0-environments", {
    treeDataProvider: environmentsDataProvider,
  });

  environmentPollingInstance = setInterval(async () => {
    const fetchedEnvironments = await getEnvironmentsForBranch();

    if (environmentsDataProvider.shouldUpdate(fetchedEnvironments)) {
      environmentsDataProvider.refresh();
    }
  }, 3000);
}

export function deactivate() {
  clearInterval(environmentPollingInstance);
}
