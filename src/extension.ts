import path from "path";
import * as vscode from "vscode";
import { Env0EnvironmentsProvider } from "./env0-environments-provider";
import { getEnvironmentsForBranch } from "./get-environments";

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

function openEnvironmentInBrowser(selection: readonly Environment[]): any {
	throw new Error("Function not implemented.");
}
