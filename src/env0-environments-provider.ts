import * as vscode from "vscode";
import environments from "./mock-environments.json";

export class Env0EnvironmentsProvider
  implements vscode.TreeDataProvider<Environment>
{
  constructor(projectId: string) {
    this.environments = environments as any;
  }
  private environments: Environment[];

  getTreeItem(element: Environment): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<Environment[]> {
    return Promise.resolve(
      this.environments.map(
        (mockEnv: any) =>
          new Environment(mockEnv.name, mockEnv.status, mockEnv.updatedAt)
      )
    );
  }

  public shouldUpdate(environmentsToCompareTo: any[]): boolean {
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
        this.environments[envIndex].lastUpdated !== newEnvironment.updatedAt
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

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class Environment extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly status: string,
    public readonly lastUpdated: string
  ) {
    super(`${getColorByStatus(status)} ${name}`);
    this.description = this.status;
    this.tooltip = `last update at ${lastUpdated}`;
  }
}

const getColorByStatus = (status: string): string => {
  console.log(status);
  switch (status) {
    case "DRIFTED":
      return "🟡";
    case "FAIL":
    case "CANCELLED":
    case "FAILED":
    case "TIMEOUT":
    case "INTERNAL_FAILURE":
    case "ABORTED":
      return "🔴";
    case "SUCCESS":
    case "ACTIVE":
      return "🟢";
  }

  return "⚪️";
};
