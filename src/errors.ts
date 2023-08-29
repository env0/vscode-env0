import axios from "axios";
import * as vscode from "vscode";
import { stopEnvironmentPolling } from "./extension";
const reLoginButtonText = "Re-Login";
const onReLoginClicked = async (buttonText?: string) => {
  if (buttonText === reLoginButtonText) {
    await vscode.commands.executeCommand("env0.logout");
    await vscode.commands.executeCommand("env0.login");
  }
};

export const onPullingEnvironmentError = async (error: any) => {
  stopEnvironmentPolling();
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      const buttonClicked = await vscode.window.showErrorMessage(
        "failed to pull environments: unauthorized, please re-login",
        reLoginButtonText
      );
      await onReLoginClicked(buttonClicked);
    } else if (error.response?.status === 403) {
      const buttonClicked = await vscode.window.showErrorMessage(
        "failed to pull environments: forbidden, please check your credentials",
        reLoginButtonText
      );
      await onReLoginClicked(buttonClicked);
    }
  }
  vscode.window.showErrorMessage(
    `failed to pull environments: unexpected error ${error.message}`
  );
};

export const onActionExecutionError = (actionName: string, error: any) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      vscode.window.showErrorMessage(
        `failed to execute action ${actionName}: unauthorized, please re-login`,
        reLoginButtonText
      );
    } else if (error.response?.status === 403) {
      vscode.window.showErrorMessage(
        `failed to execute action ${actionName}: forbidden, please check your credentials`,
        reLoginButtonText
      );
    }
  }
  vscode.window.showErrorMessage(
    `failed to execute action ${actionName}: unexpected error ${error.message}`
  );
};
