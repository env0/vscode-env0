import axios from "axios";
import * as vscode from "vscode";
import { Env0EnvironmentsProvider } from "./env0-environments-provider";
import { getEnvironmentsForBranch } from "./get-environments";
import { getApiKeyCredentials } from "./auth";

const ENV0_BASE_URL = "api-dev.dev.env0.com";
let environmentPollingInstance: NodeJS.Timer;

export function activate(context: vscode.ExtensionContext) {
  const environmentsDataProvider = new Env0EnvironmentsProvider();
  const tree = vscode.window.createTreeView("env0-environments", {
    treeDataProvider: environmentsDataProvider,
  });

  tree.onDidChangeSelection((e) => {
    const env = e.selection[0] ?? e.selection;

    // onClick here
  });

  vscode.commands.registerCommand("env0.openInEnv0", (env) => {
    openEnvironmentInBrowser(env);
  });

  vscode.commands.registerCommand("env0.redeploy", (env) => {
    redeployEnvironment(env);
    environmentsDataProvider.refresh();
  });

  vscode.commands.registerCommand("env0.destroy", (env) => {
    destroyEnvironment(env);
    environmentsDataProvider.refresh();
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
  clearInterval(environmentPollingInstance);
}

const openEnvironmentInBrowser = ({ id, projectId }: any) => {
  if (!id || !projectId) {
    return;
  }

  vscode.env.openExternal(
    vscode.Uri.parse(
      `https://dev.dev.env0.com/p/${projectId}/environments/${id}`
    )
  );
};

const redeployEnvironment = (env: any) => {
  if (!env.id) {
    return;
  }

  const apiKeyCredentials = getApiKeyCredentials();
  const redeployUrl = `https://${ENV0_BASE_URL}/environments/${env.id}/deployments`;
  axios.post(redeployUrl, {}, { auth: apiKeyCredentials });
};

const destroyEnvironment = (env: any) => {
  if (!env.id) {
    return;
  }

  const apiKeyCredentials = getApiKeyCredentials();
  const redeployUrl = `https://${ENV0_BASE_URL}/environments/${env.id}/destroy`;
  axios.post(redeployUrl, {}, { auth: apiKeyCredentials });
};
