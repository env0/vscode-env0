import path from "path";
import * as vscode from "vscode";
import { ResourceChanges } from "./env0-pretty-plan-provider";
import { EnvironmentModel, getEnvironmentsForBranch } from "./get-environments";
import { showErrorMessage, showInProgressMessage, showSuccessMessage, showWaitingForApproval } from "./notification-messages";

export class Env0EnvironmentsProvider
  implements vscode.TreeDataProvider<Environment>
{
  constructor() {
    this.environments = [];
  }
  private environments: Environment[];

  getTreeItem(element: Environment): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<Environment[]> {
    const envs = await getEnvironmentsForBranch();
    console.log(envs);
    
    this.environments = envs.map(
      (env) =>
        new Environment(
          env.name,
          env.status,
          env.updatedAt,
          env.id,
          env.projectId,
          env.latestDeploymentLog.plan?.resourceChanges
        )
    );

    return Promise.resolve(this.environments);
  }

  public shouldUpdate(environmentsToCompareTo: EnvironmentModel[]): boolean {
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
        this.environments[envIndex].lastUpdated !== newEnvironment.updatedAt && this.environments[envIndex].status !== newEnvironment.status
      ) {
        if (newEnvironment.status === 'DEPLOY_IN_PROGRESS') {
          showInProgressMessage({environmentId:newEnvironment.id, projectId:newEnvironment.projectId})
        }

        if (newEnvironment.status === 'FAILED') {
          showErrorMessage(newEnvironment.latestDeploymentLog?.error?.message, {environmentId:newEnvironment.id, projectId:newEnvironment.projectId})
        }

        if (newEnvironment.status === 'WAITING_FOR_USER') {
          showWaitingForApproval({environmentId:newEnvironment.id, projectId:newEnvironment.projectId})
        }

        if (newEnvironment.status === 'ACTIVE') {
          showSuccessMessage({environmentId:newEnvironment.id, projectId:newEnvironment.projectId})
        }


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

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class Environment extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly status: string,
    public readonly lastUpdated: string,
    public readonly id: string,
    public readonly projectId: string,
    public readonly resourceChanges: ResourceChanges[]
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
  }
}

const getIconByStatus = (status: string): string => {
  switch (status) {
    case "DRIFTED":
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
      return "favicon-16x16.png";
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
