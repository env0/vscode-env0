import * as vscode from "vscode";
import { AuthService } from "./auth";
import {
  Env0EnvironmentsProvider,
  Environment,
} from "./env0-environments-provider";
import { getCurrentBranchWithRetry, getGitRepoAndBranch } from "./utils/git";
import { apiClient } from "./api-client";
import { ENV0_ENVIRONMENTS_VIEW_ID } from "./common";
import { EnvironmentLogsProvider } from "./environment-logs-provider";
import { registerEnvironmentActions } from "./actions";

let environmentPollingInstance: NodeJS.Timer;
let _context: vscode.ExtensionContext;
let environmentLogsProvider: EnvironmentLogsProvider;
export let environmentsTree: vscode.TreeView<Environment>;
export let environmentsDataProvider: Env0EnvironmentsProvider;

// this function used by tests in order to reset the extension state after each test
export const _reset = async () => {
  deactivate();
  for (const sub of _context.subscriptions) {
    sub.dispose();
  }
  await activate(_context);
};

export const setContextShowLoginMessage = async (value: boolean) => {
  await vscode.commands.executeCommand(
    "setContext",
    `env0.showLoginMessage`,
    value
  );
};

const showNoEnvironmentsMessage = () => {
  try {
    const { currentBranch } = getGitRepoAndBranch();
    environmentsTree.message = `couldn’t find environments associated with ${currentBranch}, please create one`;
  } catch (e) {
    environmentsTree.message = `couldn’t find environments associated with current branch, please create one`;
  }
};

const clearViewMessage = () => {
  environmentsTree.message = undefined;
};

export const loadEnvironments = async (
  environmentsDataProvider: Env0EnvironmentsProvider,
  environmentsTree: vscode.TreeView<Environment>
) => {
  environmentsTree.message = `loading environments...`;
  let currentBranch: string;
  try {
    currentBranch = await getCurrentBranchWithRetry();
  } catch (e) {
    environmentsTree.message = "Could not find current git branch.";
    return;
  }
  environmentsTree.message = `loading environments from branch ${currentBranch}...`;
  await environmentsDataProvider.refresh();
};

const restartLogs = async (env: Environment, deploymentId?: string) => {
  if (environmentLogsProvider) {
    environmentLogsProvider.abort();
  }
  environmentLogsProvider = new EnvironmentLogsProvider(env, deploymentId);
};

const init = async (
  environmentsDataProvider: Env0EnvironmentsProvider,
  environmentsTree: vscode.TreeView<Environment>,
  authService: AuthService
) => {
  apiClient.init(await authService.getApiKeyCredentials());
  environmentsDataProvider.onLogin();
  await loadEnvironments(environmentsDataProvider, environmentsTree);

  environmentPollingInstance = setInterval(async () => {
    environmentsDataProvider.refresh();
  }, 3000);
};

const onLogOut = async () => {
  if (environmentLogsProvider) {
    environmentLogsProvider.abort();
  }
  stopEnvironmentPolling();
  environmentsDataProvider.onLogout();
  apiClient.clearCredentials();
  environmentsTree.message =
    "you are logged out. in order to log in, run the command 'env0.login'";
};

export async function activate(context: vscode.ExtensionContext) {
  _context = context;
  environmentsDataProvider = new Env0EnvironmentsProvider(
    showNoEnvironmentsMessage,
    clearViewMessage
  );
  environmentsTree = vscode.window.createTreeView(ENV0_ENVIRONMENTS_VIEW_ID, {
    treeDataProvider: environmentsDataProvider,
  });
  EnvironmentLogsProvider.initEnvironmentOutputChannel();
  const authService = new AuthService(context);
  authService.registerLoginCommand(async () => {
    clearViewMessage();
    await init(environmentsDataProvider, environmentsTree, authService);
    await setContextShowLoginMessage(false);
  });
  authService.registerLogoutCommand(onLogOut);

  environmentsTree.onDidChangeSelection(async (e) => {
    const env = e.selection[0];

    if (env) {
      restartLogs(env);
    }
  });

  registerEnvironmentActions(
    context,
    environmentsTree,
    environmentsDataProvider,
    restartLogs
  );

  const isLoggedIn = await authService.isLoggedIn();

  if (isLoggedIn) {
    await init(environmentsDataProvider, environmentsTree, authService);
  } else {
    await setContextShowLoginMessage(true);
  }
}
const stopEnvironmentPolling = () => {
  clearInterval(environmentPollingInstance);
};

export function deactivate() {
  stopEnvironmentPolling();
}
