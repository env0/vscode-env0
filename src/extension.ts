import axios from "axios";
import * as vscode from "vscode";
import { getApiKeyCredentials } from "./auth";
import { Env0EnvironmentsProvider } from "./env0-environments-provider";
import { getEnvironmentsForBranch } from "./get-environments";

export const ENV0_BASE_URL = "api-dev.dev.env0.com";
let environmentPollingInstance: NodeJS.Timer;
// const botoStars = 'env0-boto0-stars-eyes.png';
const botoStars ='https://i.postimg.cc/3NC0PxyR/ezgif-com-gif-maker.gif';
const botoRegular = 'https://i.postimg.cc/T3N4FrWK/env0-boto0-regular.png';
const botoError = 'https://i.postimg.cc/kggHTjDr/env0-boto0-fail.png';


export function activate(context: vscode.ExtensionContext) {
  const environmentsDataProvider = new Env0EnvironmentsProvider();
  const tree = vscode.window.createTreeView("env0-environments", {
    treeDataProvider: environmentsDataProvider,
  });

  tree.onDidChangeSelection((e) => openEnvironmentInBrowser(e.selection));

  environmentPollingInstance = setInterval(async () => {
    const fetchedEnvironments = await getEnvironmentsForBranch();

    if (
      fetchedEnvironments &&
      environmentsDataProvider.shouldUpdate(fetchedEnvironments)
    ) {
      environmentsDataProvider.refresh();
    }
  }, 3000);

	///////////////////////

	const provider = new BotoProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(BotoProvider.viewType, provider));
}

export function deactivate() {
	clearInterval(environmentPollingInstance);
}

class BotoProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'env0-boto0';
	private readonly _extensionUri: vscode.Uri;

	private _view?: vscode.WebviewView;

	constructor(extensionUri: vscode.Uri) {
		this._extensionUri = extensionUri;
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
	) {
		this._view = webviewView;
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body>
				<div style="height: 100%; width: 100%;">
					<div style="position: absolute; bottom:0;">
						<img src="${botoRegular}" width="300" style="padding-left: 50px;"/>
					</div>
				</div>
			</body>
			</html>`;
	}
}

const openEnvironmentInBrowser = ({ id, projectId }: any) => {
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
  }, 3000);

  return logPoller;
}
