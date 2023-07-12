import * as vscode from "vscode";

export const setContextShowLoginMessage = async (value: boolean) => {
  await vscode.commands.executeCommand(
    "setContext",
    `env0.showLoginMessage`,
    value
  );
};
