import * as vscode from "vscode";
import { Env0EnvironmentsProvider } from "./env0-environments-provider";
export function activate(context: vscode.ExtensionContext) {
  vscode.window.createTreeView("env0-environments", {
    treeDataProvider: new Env0EnvironmentsProvider("some-project-id"),
  });

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  // let disposable = vscode.commands.registerCommand("env0.helloWorld", () => {
  //   // The code you place here will be executed every time your command is executed
  //   // Display a message box to the user
  //   vscode.window.showInformationMessage("Hello World from env0!");
  // });

  // context.subscriptions.push(disposable);
}

export function deactivate() {}
