import axios from "axios";
import * as vscode from "vscode";
import { getApiKeyCredentials } from "./auth";
import { Environment } from "./env0-environments-provider";
import { ENV0_API_URL, ENV0_WEB_URL } from "./common";

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
  const apiKeyCredentials = getApiKeyCredentials();
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }

  const abortDeploymentUrl = `https://${ENV0_API_URL}/environments/deployments/${id}/abort`;
  axios.post(abortDeploymentUrl, {}, { auth: apiKeyCredentials });
};

export const cancelDeployment = (env: Environment) => {
  const apiKeyCredentials = getApiKeyCredentials();
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }

  const cancelDeployUrl = `https://${ENV0_API_URL}/environments/deployments/${id}/cancel`;
  axios.put(cancelDeployUrl, undefined, { auth: apiKeyCredentials });
};

export const resumeDeployment = (env: Environment) => {
  const apiKeyCredentials = getApiKeyCredentials();
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }

  const resumeDeployUrl = `https://${ENV0_API_URL}/environments/deployments/${id}`;
  axios.put(resumeDeployUrl, undefined, { auth: apiKeyCredentials });
};

export const redeployEnvironment = (env: Environment) => {
  if (!env.id) {
    return;
  }

  const apiKeyCredentials = getApiKeyCredentials();
  const redeployUrl = `https://${ENV0_API_URL}/environments/${env.id}/deployments`;
  axios.post(redeployUrl, {}, { auth: apiKeyCredentials });
};

export const destroyEnvironment = (env: Environment) => {
  if (!env.id) {
    return;
  }

  const apiKeyCredentials = getApiKeyCredentials();
  const destroyUrl = `https://${ENV0_API_URL}/environments/${env.id}/destroy`;
  axios.post(destroyUrl, {}, { auth: apiKeyCredentials });
};
