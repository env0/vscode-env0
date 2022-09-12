import axios from "axios";
import * as vscode from "vscode";
import { getApiKeyCredentials } from "./auth";
import { ENV0_BASE_URL } from "./extension";

export const openEnvironmentInBrowser = ({ id, projectId }: any) => {
  if (!id || !projectId) {
    return;
  }

  vscode.env.openExternal(
    vscode.Uri.parse(
      `https://dev.dev.env0.com/p/${projectId}/environments/${id}`
    )
  );
};

export const abortEnvironmentDeploy = (env: any) => {
  const apiKeyCredentials = getApiKeyCredentials();
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }

  const abortDeploymentUrl = `https://${ENV0_BASE_URL}/environments/deployments/${id}/abort`;
  axios.post(abortDeploymentUrl, {}, { auth: apiKeyCredentials });
};

export const cancelDeployment = (env: any) => {
  const apiKeyCredentials = getApiKeyCredentials();
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }

  const cancelDeployUrl = `https://${ENV0_BASE_URL}/environments/deployments/${id}/cancel`;
  axios.put(cancelDeployUrl, undefined, { auth: apiKeyCredentials });
};

export const resumeDeployment = (env: any) => {
  const apiKeyCredentials = getApiKeyCredentials();
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }

  const resumeDeployUrl = `https://${ENV0_BASE_URL}/environments/deployments/${id}`;
  axios.put(resumeDeployUrl, undefined, { auth: apiKeyCredentials });
};

export const redeployEnvironment = (env: any) => {
  if (!env.id) {
    return;
  }

  const apiKeyCredentials = getApiKeyCredentials();
  const redeployUrl = `https://${ENV0_BASE_URL}/environments/${env.id}/deployments`;
  axios.post(redeployUrl, {}, { auth: apiKeyCredentials });
};

export const destroyEnvironment = (env: any) => {
  if (!env.id) {
    return;
  }

  const apiKeyCredentials = getApiKeyCredentials();
  const destroyUrl = `https://${ENV0_BASE_URL}/environments/${env.id}/destroy`;
  axios.post(destroyUrl, {}, { auth: apiKeyCredentials });
};
