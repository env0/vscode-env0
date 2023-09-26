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

export const onPollingEnvironmentError = async (error: Error) => {
  stopEnvironmentPolling();
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      onUnauthorized("failed to pull environments");
      return;
    } else if (error.response?.status === 403) {
      onForbidden("failed to pull environments");
      return;
    }
  }
  vscode.window.showErrorMessage(
    `failed to pull environments: unexpected error ${error.message}`
  );
};

export const onActionExecutionError = (actionName: string, error: Error) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      onUnauthorized(`failed to execute action ${actionName}`);
      return;
    } else if (error.response?.status === 403) {
      onForbidden(`failed to execute action ${actionName}`);
      return;
    }
  }
  vscode.window.showErrorMessage(
    `failed to execute action ${actionName}: unexpected error ${error.message}`
  );
};

export const onLogsPollingError = async (error: Error) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      onUnauthorized("failed to pull logs");
      return;
    } else if (error.response?.status === 403) {
      onForbidden("failed to pull logs");
      return;
    }
  }

  vscode.window.showErrorMessage(
    `failed to pull logs: unexpected error ${error.message}`
  );
};

export const getCannotFindEnvironmentMessage = (
  currentBranch: string | undefined
) =>
  `couldn’t find environments associated with current branch${
    currentBranch ? ` "${currentBranch}"` : ""
  } Note: This view displays only environments specifically associated with the current working branch.`;

export const cannotGetDefaultBranchMessage =
  "Failed to get repo default branch, All env0 environments without a specified branch will not be displayed";

export const showCannotGetDefaultBranchMessage = () =>
  vscode.window.showErrorMessage(cannotGetDefaultBranchMessage);

export const getDefaultBranchErrorMessage =
  "Failed to get the default branch with error: ";

export const showGetDefaultBranchError = (error: Error) =>
  vscode.window.showErrorMessage(
    `${getDefaultBranchErrorMessage} ${error.message || error}`
  );
