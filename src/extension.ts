import * as vscode from "vscode";
import { AuthService } from "./auth";
import {
  Env0EnvironmentsProvider,
  Environment,
} from "./env0-environments-provider";
import { getCurrentBranchWithRetry } from "./utils/git";
import { apiClient } from "./api-client";
import { ENV0_ENVIRONMENTS_VIEW_ID } from "./common";
import { EnvironmentLogsProvider } from "./environment-logs-provider";
import { registerEnvironmentActions } from "./actions";
import { onPollingEnvironmentError } from "./errors";
import { extensionState } from "./extension-state";

let environmentPollingInstance: NodeJS.Timer;
let _context: vscode.ExtensionContext;
let environmentLogsProvider: EnvironmentLogsProvider;
export let environmentsTree: vscode.TreeView<Environment>;
export let environmentsDataProvider: Env0EnvironmentsProvider;

// this function used by tests in order to reset the extension state after each test
export const _reset = async () => {
  deactivate();
  extensionState.clear();
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

export const loadEnvironments = async (
  environmentsDataProvider: Env0EnvironmentsProvider
) => {
  extensionState.setIsLoading(true);
  let currentBranch: string;
  try {
    currentBranch = await getCurrentBranchWithRetry();
    extensionState.setCurrentBranch(currentBranch);
  } catch (e) {
    extensionState.onFailedToGetBranch();
    return;
  }
  try {
    await environmentsDataProvider.refresh();
    startEnvironmentPolling();
  } catch (e) {
    onPollingEnvironmentError(e as Error);
  } finally {
    extensionState.setIsLoading(false);
  }
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
  extensionState.setLoggedIn(true);
  await loadEnvironments(environmentsDataProvider);
};

const onLogOut = async () => {
  if (environmentLogsProvider) {
    environmentLogsProvider.abort();
  }
  stopEnvironmentPolling();
  environmentsDataProvider.clear();
  apiClient.clearCredentials();
  extensionState.setLoggedIn(false);
};

export async function activate(context: vscode.ExtensionContext) {
  _context = context;
  environmentsDataProvider = new Env0EnvironmentsProvider();
  environmentsTree = vscode.window.createTreeView(ENV0_ENVIRONMENTS_VIEW_ID, {
    treeDataProvider: environmentsDataProvider,
  });
  extensionState.init(environmentsTree);
  EnvironmentLogsProvider.initEnvironmentOutputChannel();
  const authService = new AuthService(context);
  authService.registerLoginCommand(async () => {
    extensionState.setLoggedIn(true);
    await init(environmentsDataProvider, environmentsTree, authService);
    await setContextShowLoginMessage(false);
  });
  authService.registerLogoutCommand(onLogOut);

  context.subscriptions.push(
    environmentsTree.onDidChangeSelection(async (e) => {
      const env = e.selection[0] as Environment;

      if (env && !env.shouldIgnoreRestartLogsOnSelect()) {
        restartLogs(env);
      }
    })
  );

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
const startEnvironmentPolling = () => {
  environmentPollingInstance = setInterval(async () => {
    environmentsDataProvider.refresh().catch(onPollingEnvironmentError);
  }, 3000);
};

export const stopEnvironmentPolling = () => {
  clearInterval(environmentPollingInstance);
};

export function deactivate() {
  stopEnvironmentPolling();
}
