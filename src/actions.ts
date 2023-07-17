import * as vscode from "vscode";
import { Environment } from "./env0-environments-provider";
import { ENV0_WEB_URL } from "./common";
import { apiClient } from "./api-client";

export const openEnvironmentInBrowser = ({ id, projectId }: Environment) => {
  if (!id || !projectId) {
    return;
  }

  vscode.env.openExternal(
    vscode.Uri.parse(
      `https://${ENV0_WEB_URL}/p/${projectId}/environments/${id}`
    )
  );
};

export const abortEnvironmentDeploy = (env: Environment) => {
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }
  apiClient.abortDeployment(id);
};

export const cancelDeployment = (env: Environment) => {
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }

  apiClient.cancelDeployment(id);
};

export const resumeDeployment = (env: Environment) => {
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }
  apiClient.resumeDeployment(id);
};

export const redeployEnvironment = (env: Environment) => {
  if (!env.id) {
    return;
  }
  apiClient.redeployEnvironment(env.id);
};

export const destroyEnvironment = (env: Environment) => {
  if (!env.id) {
    return;
  }
  apiClient.destroyEnvironment(env.id);
};
