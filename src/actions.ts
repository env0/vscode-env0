import * as vscode from "vscode";
import { getApiKeyCredentials } from "./auth";
import { Environment } from "./env0-environments-provider";
import { ENV0_API_URL, ENV0_WEB_URL } from "./common";
import { ApiClient } from "./api-client";

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

export const abortEnvironmentDeploy = (env: Environment, api: ApiClient) => {
  const apiKeyCredentials = getApiKeyCredentials();
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }
  api.abortDeployment(id);
};

export const cancelDeployment = (env: Environment, api: ApiClient) => {
  const apiKeyCredentials = getApiKeyCredentials();
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }

  api.cancelDeployment(id);
};

export const resumeDeployment = (env: Environment, api: ApiClient) => {
  const apiKeyCredentials = getApiKeyCredentials();
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }
  api.resumeDeployment(id);
};

export const redeployEnvironment = (env: Environment, api: ApiClient) => {
  if (!env.id) {
    return;
  }
  api.redeployEnvironment(env.id);
};

export const destroyEnvironment = (env: Environment, api: ApiClient) => {
  if (!env.id) {
    return;
  }
  api.destroyEnvironment(env.id);
};
