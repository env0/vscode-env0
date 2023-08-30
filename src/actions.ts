import * as vscode from "vscode";
import {
  Env0EnvironmentsProvider,
  Environment,
} from "./env0-environments-provider";
import { ENV0_ENVIRONMENTS_VIEW_ID, ENV0_WEB_URL } from "./common";
import { apiClient } from "./api-client";
import { onActionExecutionError } from "./errors";

const openEnvironmentInBrowser = ({ id, projectId }: Environment) => {
  if (!id || !projectId) {
    return;
  }

  vscode.env.openExternal(
    vscode.Uri.parse(
      `https://${ENV0_WEB_URL}/p/${projectId}/environments/${id}`
    )
  );
};

const abortEnvironmentDeploy = async (env: Environment) => {
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }
  await apiClient.abortDeployment(id);
};

const cancelDeployment = async (env: Environment) => {
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }

  return await apiClient.cancelDeployment(id);
};

const resumeDeployment = async (env: Environment) => {
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }
  return await apiClient.resumeDeployment(id);
};

const redeployEnvironment = async (env: Environment) => {
  if (!env.id) {
    return;
  }
  return await apiClient.redeployEnvironment(env.id);
};

const destroyEnvironment = async (env: Environment) => {
  if (!env.id) {
    return;
  }
  return await apiClient.destroyEnvironment(env.id);
};

const actions: Record<
  string,
  (env: Environment) => Promise<{ id: string } | void>
> = {
  "env0.redeploy": redeployEnvironment,
  "env0.abort": abortEnvironmentDeploy,
  "env0.destroy": destroyEnvironment,
  "env0.approve": resumeDeployment,
  "env0.cancel": cancelDeployment,
};
const actionsNames: Record<string, string> = {
  "env0.redeploy": "redeploy",
  "env0.abort": "abort",
  "env0.destroy": "destroy",
  "env0.approve": "approve",
  "env0.cancel": "cancel",
};

export const registerEnvironmentActions = (
  context: vscode.ExtensionContext,
  environmentsTree: vscode.TreeView<Environment>,
  environmentsDataProvider: Env0EnvironmentsProvider,
  restartLogs: (env: Environment, deploymentId?: string) => unknown
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("env0.openInEnv0", (env) => {
      openEnvironmentInBrowser(env);
    })
  );

  for (const actionCommand in actions) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        actionCommand,
        async (env: Environment) => {
          await vscode.window.withProgress(
            {
              location: { viewId: ENV0_ENVIRONMENTS_VIEW_ID },
            },
            async () => {
              let actionResponse;
              try {
                env.setIgnoreLogRestartOnSelect(true);
                await environmentsTree.reveal(env, {
                  select: true,
                  focus: true,
                });
                actionResponse = await actions[actionCommand](env);
              } catch (e) {
                onActionExecutionError(actionsNames[actionCommand], e as Error);
              } finally {
                environmentsDataProvider.refresh();
                restartLogs(env, actionResponse?.id);
                env.setIgnoreLogRestartOnSelect(false);
              }
            }
          );
        }
      )
    );
  }
};
