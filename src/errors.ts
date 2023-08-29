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

const onUnauthorized = async (errorMessage: string) => {
  const buttonClicked = await vscode.window.showErrorMessage(
    `${errorMessage}: unauthorized, please re-login`,
    reLoginButtonText
  );
  await onReLoginClicked(buttonClicked);
};

const onForbidden = async (errorMessage: string) => {
  const buttonClicked = await vscode.window.showErrorMessage(
    `${errorMessage}: forbidden, please check your credentials`,
    reLoginButtonText
  );
  await onReLoginClicked(buttonClicked);
};

export const onPullingEnvironmentError = async (error: any) => {
  stopEnvironmentPolling();
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      onUnauthorized("failed to pull environments");
    } else if (error.response?.status === 403) {
      onForbidden("failed to pull environments");
    }
  }
  vscode.window.showErrorMessage(
    `failed to pull environments: unexpected error ${error.message}`
  );
};

export const onActionExecutionError = (actionName: string, error: any) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      onUnauthorized(`failed to execute action ${actionName}`);
    } else if (error.response?.status === 403) {
      onForbidden(`failed to execute action ${actionName}`);
    }
  }
  vscode.window.showErrorMessage(
    `failed to execute action ${actionName}: unexpected error ${error.message}`
  );
};

export const onLogsPollingError = async (error: any) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      onUnauthorized("failed to pull logs");
    } else if (error.response?.status === 403) {
      onForbidden("failed to pull logs");
    }
  }

  vscode.window.showErrorMessage(
    `failed to pull logs: unexpected error ${error.message}`
  );
};
