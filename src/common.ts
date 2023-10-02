import * as vscode from "vscode";

export const ENV0_API_URL =
  vscode.workspace.getConfiguration("env0").get("apiUrl") ||
  "api-dev.dev.env0.com";
export const ENV0_WEB_URL =
  vscode.workspace.getConfiguration("env0").get("webUrl") || "dev.dev.env0.com";
export const ENV0_ENVIRONMENTS_VIEW_ID = "env0-environments";
