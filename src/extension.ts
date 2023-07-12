import axios from "axios";
import * as vscode from "vscode";
import stripAnsi from "strip-ansi";
import {
  abortEnvironmentDeploy,
  cancelDeployment,
  destroyEnvironment,
  openEnvironmentInBrowser,
  redeployEnvironment,
  resumeDeployment,
} from "./actions";
import { AuthService } from "./auth";
import {
  Env0EnvironmentsProvider,
  Environment,
} from "./env0-environments-provider";
import { getEnvironmentsForBranch } from "./get-environments";
import { ENV0_API_URL } from "./common";
import { getCurrentBranchWithRetry } from "./utils/git";
import { ApiClient } from "./api-client";

let logPoller: NodeJS.Timeout;
let environmentPollingInstance: NodeJS.Timer;
export interface LogChannel {
  channel: vscode.OutputChannel;
  startTime?: number | string;
  hasMoreLogs?: boolean;
}
export const loadEnvironments = async (
  environmentsDataProvider: Env0EnvironmentsProvider,
  environmentsTree: vscode.TreeView<Environment>
) => {
  environmentsTree.message = `loading environments...`;
  const currentBranch = await getCurrentBranchWithRetry();
  environmentsTree.message = `loading environments from branch ${currentBranch}...`;
  await environmentsDataProvider.refresh();
  environmentsTree.message = undefined;
};

const init = async (
  environmentsDataProvider: Env0EnvironmentsProvider,
  environmentsTree: vscode.TreeView<Environment>,
  apiClient: ApiClient
) => {
  await loadEnvironments(environmentsDataProvider, environmentsTree);
  const logChannels: Record<string, LogChannel> = {};

  async function restartLogs(env: Environment) {
    Object.values(logChannels).forEach((l) => l.channel.dispose());
    Object.keys(logChannels).forEach((key) => delete logChannels[key]);
    clearInterval(logPoller);
    if (env.id) {
      logPoller = await pollForEnvironmentLogs(env, logChannels, apiClient);
    }
  }

  environmentsTree.onDidChangeSelection(async (e) => {
    const env = e.selection[0] ?? e.selection;

    restartLogs(env);
  });

  vscode.commands.registerCommand("env0.openInEnv0", (env) => {
    openEnvironmentInBrowser(env);
  });

  vscode.commands.registerCommand("env0.redeploy", (env) => {
    redeployEnvironment(env, apiClient);
    environmentsDataProvider.refresh();
    restartLogs(env);
  });

  vscode.commands.registerCommand("env0.abort", (env) => {
    abortEnvironmentDeploy(env, apiClient);
    environmentsDataProvider.refresh();
    restartLogs(env);
  });

  vscode.commands.registerCommand("env0.destroy", (env) => {
    destroyEnvironment(env, apiClient);
    environmentsDataProvider.refresh();
    restartLogs(env);
  });

  vscode.commands.registerCommand("env0.approve", (env) => {
    resumeDeployment(env, apiClient);
    environmentsDataProvider.refresh();
    restartLogs(env);
  });

  vscode.commands.registerCommand("env0.cancel", (env) => {
    cancelDeployment(env, apiClient);
    environmentsDataProvider.refresh();
    restartLogs(env);
  });

  environmentPollingInstance = setInterval(async () => {
    const fetchedEnvironments = await getEnvironmentsForBranch(apiClient);

    if (
      fetchedEnvironments &&
      environmentsDataProvider.shouldUpdate(fetchedEnvironments)
    ) {
      environmentsDataProvider.refresh();
    }
  }, 3000);
};

export async function activate(context: vscode.ExtensionContext) {
  const authService = new AuthService(context);
  authService.registerLoginCommand();
  authService.registerLogoutCommand();
  const apiClient: ApiClient = new ApiClient(authService);
  const environmentsDataProvider = new Env0EnvironmentsProvider(apiClient);
  const environmentsTree = vscode.window.createTreeView("env0-environments", {
    treeDataProvider: environmentsDataProvider,
  });
  await init(environmentsDataProvider, environmentsTree, apiClient);
}

export function deactivate() {
  clearInterval(logPoller);
  clearInterval(environmentPollingInstance);
}

async function pollForEnvironmentLogs(
  env: Environment,
  logChannels: Record<string, LogChannel>,
  apiClient: ApiClient
) {
  const logPoller = setInterval(async () => {
    const steps = await apiClient.getDeploymentSteps(env.latestDeploymentLogId);

    steps.forEach(async (step) => {
      let stepLog = logChannels[step.name];
      if (!stepLog) {
        logChannels[step.name] = {
          channel: vscode.window.createOutputChannel(
            `(env0) ${step.name}`,
            "ansi"
          ),
        };
        stepLog = logChannels[step.name];
      }

      if (stepLog.hasMoreLogs !== false) {
        try {
          const logs = await apiClient.getDeploymentStepLogs(
            env.latestDeploymentLogId,
            step.name,
            stepLog.startTime
          );

          logs.events.forEach((event) => {
            (logChannels[step.name].channel as vscode.OutputChannel).appendLine(
              stripAnsi(event.message)
            );
          });
          stepLog.startTime = logs.nextStartTime;
          stepLog.hasMoreLogs = logs.hasMoreLogs;
          if (step.status === "IN_PROGRESS") {
            stepLog.channel.show();
          }
        } catch (e) {
          console.error("oh no", { e });
        }
      }
    });
  }, 1000);

  return logPoller;
}
