import axios from "axios";
import * as vscode from "vscode";
import { stopEnvironmentPolling } from "./extension";

export const onPullingEnvironmentError = (error: any) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      vscode.window.showErrorMessage(
        // todo consider adding a link to the logout command and login command
        "failed to pull environments: unauthorized, please logout and login again using the command 'env0.logout' and then 'env0.login'"
      );
    } else if (error.response?.status === 403) {
      vscode.window.showErrorMessage(
        "failed to pull environments: forbidden, please check your credentials"
      );
    }
  }
  vscode.window.showErrorMessage(
    "failed to pull environments: unexpected error"
  );
  stopEnvironmentPolling();
};

export const onActionExecutionError = (actionName: string, error: any) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      vscode.window.showErrorMessage(
        // todo consider adding a link to the logout command and login command
        `failed to execute action ${actionName}: unauthorized, please logout and login again using the command 'env0.logout' and then 'env0.login'`
      );
    } else if (error.response?.status === 403) {
      vscode.window.showErrorMessage(
        `failed to execute action ${actionName}: forbidden, please check your credentials`
      );
    }
  }
  vscode.window.showErrorMessage(
    // todo should we show the error message?
    `failed to execute action ${actionName}: unexpected error`
  );
};
