// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "env0" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('env0.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from env0!');
	});
	const configurationWorkspace = vscode.workspace.getConfiguration()

	let readAccessKey = vscode.commands.registerCommand('env0.readAccessKey', () => {
		const env0AccessKey: string | undefined = configurationWorkspace.get("env0.accessKey")
		console.log(env0AccessKey)
		vscode.window.showInformationMessage(env0AccessKey || 'could not find env0 access key');
	});

	let readSecretKey = vscode.commands.registerCommand('env0.readSecretKey', () => {
		const env0SecretKey: string | undefined = configurationWorkspace.get("env0.secretKey")
		console.log(env0SecretKey)
		vscode.window.showInformationMessage(env0SecretKey || 'could not find env0 secret key');
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(readAccessKey);
	context.subscriptions.push(readSecretKey);
}

// this method is called when your extension is deactivated
export function deactivate() {}
