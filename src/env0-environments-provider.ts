import path from "path";
import * as vscode from "vscode";
import { EnvironmentModel, getEnvironmentsForBranch } from "./get-environments";
import {
  showErrorMessage,
  showInProgressMessage,
  showSuccessMessage,
  showWaitingForApproval,
} from "./notification-messages";
import { extensionState } from "./extension-state";
import { isEmpty } from "lodash";

export class Environment extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly status: string,
    public readonly lastUpdated: string,
    public readonly id: string,
    public readonly projectId: string,
    public readonly latestDeploymentLogId: string
  ) {
    super(name);
    this.description = this.status;
    this.tooltip = `last update at ${lastUpdated}`;
    this.iconPath = path.join(
      __filename,
      "..",
      "..",
      "resources",
      getIconByStatus(status)
    );

    if (status.includes("IN_PROGRESS")) {
      this.contextValue = "IN_PROGRESS";
    }

    if (status.includes("WAITING_FOR_USER")) {
      this.contextValue = "WAITING_FOR_USER";
    }
  }

  setIgnoreLogRestartOnSelect(value: boolean) {
    if (value) {
      Environment.ignoreRestartLogsOnSelect[this.id] = value;
    } else {
      delete Environment.ignoreRestartLogsOnSelect[this.id];
    }
  }

  shouldIgnoreRestartLogsOnSelect() {
    return Environment.ignoreRestartLogsOnSelect[this.id];
  }

  static ignoreRestartLogsOnSelect: Record<string, boolean> = {};
}

export class Env0EnvironmentsProvider
  implements vscode.TreeDataProvider<Environment>
{
  private environments: EnvironmentModel[] = [];
  private isRefreshing = false;

  getTreeItem(element: Environment): vscode.TreeItem {
    return element;
  }

  getChildren(): Environment[] {
    return this.environments.map(
      (env) =>
        new Environment(
          env.name,
          env.status,
          env.updatedAt,
          env.id,
          env.projectId,
          env.latestDeploymentLog.id
        )
    );
  }

  getParent(): vscode.ProviderResult<Environment> {
    return null;
  }

  private shouldUpdate(environmentsToCompareTo: EnvironmentModel[]): boolean {
    if (environmentsToCompareTo.length !== this.environments.length) {
      return true;
    }

    for (const newEnvironment of environmentsToCompareTo) {
      const envIndex: number = this.environments.findIndex(
        (env) => env.id === newEnvironment.id
      );

      if (envIndex === -1) {
        return true;
      }

      if (
        this.environments[envIndex].updatedAt !== newEnvironment.updatedAt &&
        this.environments[envIndex].status !== newEnvironment.status
      ) {
        return true;
      }
    }

    return false;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    Environment | undefined | null | void
  > = new vscode.EventEmitter<Environment | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    Environment | undefined | null | void
  > = this._onDidChangeTreeData.event;

  clear(): void {
    this.isRefreshing = false;
    this.environments = [];
    this._onDidChangeTreeData.fire();
  }

  async refresh(): Promise<void> {
    if (this.isRefreshing || !extensionState.isLoggedIn) {
      return;
    }
    this.isRefreshing = true;
    try {
      const newEnvironments = await getEnvironmentsForBranch();
      // we need to avoid taking any action in case user logged out while we were waiting for the response
      if (!extensionState.isLoggedIn) {
        return;
      }
      extensionState.setNoEnvironment(isEmpty(newEnvironments));
      if (this.shouldUpdate(newEnvironments)) {
        showEnvironmentStatusChangedNotification(
          this.environments,
          newEnvironments
        );
        this.environments = newEnvironments;
        this._onDidChangeTreeData.fire();
      }
    } finally {
      this.isRefreshing = false;
    }
  }
}

function showEnvironmentStatusChangedNotification(
  oldEnvironments: EnvironmentModel[],
  newEnvironments: EnvironmentModel[]
) {
  for (const newEnvironment of newEnvironments) {
    const envIndex: number = oldEnvironments.findIndex(
      (env) => env.id === newEnvironment.id
    );

    if (envIndex === -1) {
      continue;
    }

    if (
      oldEnvironments[envIndex].updatedAt !== newEnvironment.updatedAt &&
      oldEnvironments[envIndex].status !== newEnvironment.status
    ) {
      switch (newEnvironment.status) {
        case "DEPLOY_IN_PROGRESS":
          showInProgressMessage({
            environmentId: newEnvironment.id,
            projectId: newEnvironment.projectId,
            environmentName: newEnvironment.name,
          });
          break;

        case "FAILED":
          showErrorMessage(newEnvironment.latestDeploymentLog?.error?.message, {
            environmentId: newEnvironment.id,
            projectId: newEnvironment.projectId,
            environmentName: newEnvironment.name,
          });
          break;

        case "WAITING_FOR_USER":
          showWaitingForApproval({
            environmentId: newEnvironment.id,
            projectId: newEnvironment.projectId,
            environmentName: newEnvironment.name,
          });
          break;

        case "ACTIVE":
          showSuccessMessage({
            environmentId: newEnvironment.id,
            projectId: newEnvironment.projectId,
            environmentName: newEnvironment.name,
          });
          break;

        default:
          break;
      }
    }
  }
}

const getIconByStatus = (status: string): string => {
  switch (status) {
    case "DRIFTED":
    case "WAITING_FOR_USER":
      return "waiting_for_user.png";
    case "FAIL":
    case "CANCELLED":
    case "FAILED":
    case "TIMEOUT":
    case "INTERNAL_FAILURE":
    case "ABORTED":
      return "failed.png";
    case "SUCCESS":
    case "ACTIVE":
      return "favicon-32x32.png";
    case "IN_PROGRESS":
    case "DEPLOY_IN_PROGRESS":
    case "DESTROY_IN_PROGRESS":
    case "PR_PLAN_IN_PROGRESS":
    case "TASK_IN_PROGRESS":
    case "DRIFT_DETECTION_IN_PROGRESS":
      return "in_progress.png";
  }

  return "inactive.png";
};
