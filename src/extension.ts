import axios from "axios";
import * as vscode from "vscode";
import { getApiKeyCredentials } from "./auth";
import { Env0EnvironmentsProvider } from "./env0-environments-provider";
import { getEnvironmentsForBranch } from "./get-environments";

export const ENV0_BASE_URL = "api-dev.dev.env0.com";
let environmentPollingInstance: NodeJS.Timer;

export function activate(context: vscode.ExtensionContext) {
  const environmentsDataProvider = new Env0EnvironmentsProvider();
  const tree = vscode.window.createTreeView("env0-environments", {
    treeDataProvider: environmentsDataProvider,
  });

  const logChannels: any = {};
  let logPoller: NodeJS.Timeout;

  tree.onDidChangeSelection(async (e) => {
    const env = e.selection[0] ?? e.selection;

    Object.values(logChannels).forEach((l: any) => (l.channel as vscode.OutputChannel).dispose());
    Object.keys(logChannels).forEach(key => delete logChannels[key]);
    clearInterval(logPoller);
    if (env.id) {
      logPoller = await pollForEnvironmentLogs(env, logChannels);
    }
  });

  vscode.commands.registerCommand("env0.openInEnv0", (env) => {
    openEnvironmentInBrowser(env);
  });

  vscode.commands.registerCommand("env0.redeploy", (env) => {
    redeployEnvironment(env);
    environmentsDataProvider.refresh();
  });

  vscode.commands.registerCommand("env0.abort", (env) => {
    abortEnvironmentDeploy(env);
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

const abortEnvironmentDeploy = (env: any) => {
  const apiKeyCredentials = getApiKeyCredentials();
  const id = env?.latestDeploymentLogId;

  if (!id) {
    return;
  }

  const redeployUrl = `https://${ENV0_BASE_URL}/environments/deployments/${id}/abort`;
  axios.post(redeployUrl, {}, { auth: apiKeyCredentials });
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

async function pollForEnvironmentLogs(env: any, logChannels: any) {
  const logPoller = setInterval(async () => {
    const apiKeyCredentials = getApiKeyCredentials();

    const options = {
      method: 'GET',
      url: `https://${ENV0_BASE_URL}/deployments/${env?.latestDeploymentLogId}/steps`,
      auth: apiKeyCredentials
    };

    const response = await axios.request(options);

    (response.data as any).forEach(async (step: any) => {
      let stepLog = logChannels[step.name];
      if(!stepLog) {
        logChannels[step.name] = { channel: vscode.window.createOutputChannel(`(env0) ${step.name}`) };
        stepLog = logChannels[step.name];
      }

      if (stepLog.hasMoreLogs !== false) {
        try {
          const response: any = await axios.get(
            `https://${ENV0_BASE_URL}/deployments/${env?.latestDeploymentLogId}/steps/${step.name}/log?startTime=${stepLog.startTime ?? ''}`,
            {
              auth: apiKeyCredentials
            }
          );

          console.log('got response', {response});
          response.data.events.forEach((event: any) => {
            (logChannels[step.name].channel as vscode.OutputChannel).appendLine(event.message);
          });
          stepLog.startTime = response.data.nextStartTime;
          stepLog.hasMoreLogs = response.data.hasMoreLogs;
          if (step.status === 'IN_PROGRESS') {
            stepLog.channel.show();
          }     
        } catch(e) {
          console.error('oh no', {e});
        }   
      }
    });
  }, 1000);

  return logPoller;
}
