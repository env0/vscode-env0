import * as vscode from "vscode";
import * as path from "path";
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
}

class Environment extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly status: string,
    lastUpdated: string
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
