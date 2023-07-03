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
import { getApiKeyCredentials } from "./auth";
import {
  Env0EnvironmentsProvider,
  Environment,
} from "./env0-environments-provider";
import { getEnvironmentsForBranch } from "./get-environments";
import { ENV0_API_URL } from "./common";
import { getCurrentBranchWithRetry } from "./utils/git";

let logPoller: NodeJS.Timeout;
let environmentPollingInstance: NodeJS.Timer;

type DeploymentStepType =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "WAITING_FOR_USER"
  | "TIMEOUT"
  | "FAIL"
  | "SUCCESS"
  | "CANCELLED"
  | "SKIPPED";

interface DeploymentStep {
  id: string;
  deploymentLogId: string;
  name: string;
  order: number;
  projectId: string;
  organizationId: string;
  status: DeploymentStepType;
  startedAt?: string;
  completedAt?: string;
}

type DeploymentStepResponse = DeploymentStep[];

interface DeploymentStepLog {
  eventId: string;
  message: string;
  level: string;
  timestamp: string | number;
}

interface DeploymentStepLogsResponse {
  events: DeploymentStepLog[];
  nextStartTime?: number | string;
  hasMoreLogs: boolean;
}

interface LogChannel {
  channel: vscode.OutputChannel;
  startTime?: number | string;
  hasMoreLogs?: boolean;
}

const loadEnvironments = async (
  environmentsDataProvider: Env0EnvironmentsProvider,
  environmentsTree: vscode.TreeView<Environment>
) => {
  environmentsTree.message = `loading environments...`;
  const currentBranch = await getCurrentBranchWithRetry();
  environmentsTree.message = `loading environments from branch ${currentBranch}…`;
  await environmentsDataProvider.refresh();
  environmentsTree.message = undefined;
};

export async function activate(context: vscode.ExtensionContext) {
  const environmentsDataProvider = new Env0EnvironmentsProvider();
  const environmentsTree = vscode.window.createTreeView("env0-environments", {
    treeDataProvider: environmentsDataProvider,
  });
  await loadEnvironments(environmentsDataProvider, environmentsTree);
  const logChannels: Record<string, LogChannel> = {};

  async function restartLogs(env: Environment) {
    Object.values(logChannels).forEach((l) => l.channel.dispose());
    Object.keys(logChannels).forEach((key) => delete logChannels[key]);
    clearInterval(logPoller);
    if (env.id) {
      logPoller = await pollForEnvironmentLogs(env, logChannels);
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
    redeployEnvironment(env);
    environmentsDataProvider.refresh();
    restartLogs(env);
  });

  vscode.commands.registerCommand("env0.abort", (env) => {
    abortEnvironmentDeploy(env);
    environmentsDataProvider.refresh();
    restartLogs(env);
  });

  vscode.commands.registerCommand("env0.destroy", (env) => {
    destroyEnvironment(env);
    environmentsDataProvider.refresh();
    restartLogs(env);
  });

  vscode.commands.registerCommand("env0.approve", (env) => {
    resumeDeployment(env);
    environmentsDataProvider.refresh();
    restartLogs(env);
  });

  vscode.commands.registerCommand("env0.cancel", (env) => {
    cancelDeployment(env);
    environmentsDataProvider.refresh();
    restartLogs(env);
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
  clearInterval(logPoller);
  clearInterval(environmentPollingInstance);
}

async function pollForEnvironmentLogs(
  env: Environment,
  logChannels: Record<string, LogChannel>
) {
  const logPoller = setInterval(async () => {
    const apiKeyCredentials = getApiKeyCredentials();

    const response = await axios.get<DeploymentStepResponse>(
      `https://${ENV0_API_URL}/deployments/${env?.latestDeploymentLogId}/steps`,
      {
        auth: apiKeyCredentials,
      }
    );

    response.data.forEach(async (step) => {
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
          const response = await axios.get<DeploymentStepLogsResponse>(
            `https://${ENV0_API_URL}/deployments/${
              env?.latestDeploymentLogId
            }/steps/${step.name}/log?startTime=${stepLog.startTime ?? ""}`,
            {
              auth: apiKeyCredentials,
            }
          );

          response.data.events.forEach((event) => {
            (logChannels[step.name].channel as vscode.OutputChannel).appendLine(
              stripAnsi(event.message)
            );
          });
          stepLog.startTime = response.data.nextStartTime;
          stepLog.hasMoreLogs = response.data.hasMoreLogs;
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
