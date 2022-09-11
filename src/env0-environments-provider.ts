import * as vscode from "vscode";
import * as path from "path";
import environments from './mock-environments.json';

export class Env0EnvironmentsProvider
  implements vscode.TreeDataProvider<Environment>
{
  constructor(projectId: string) {
    console.log("environments...");
    console.log(environments);
    this.environments = environments as any;
  }
  private environments: Environment[];

  getTreeItem(element: Environment): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<Environment[]> {
    return Promise.resolve(
      this.environments.map(
        (mockEnv) => new Environment(mockEnv.name, mockEnv.status)
      )
    );
  }
}

class Environment extends vscode.TreeItem {
  constructor(public readonly name: string, public readonly status: string) {
    super(name);
    this.tooltip = this.name;
    this.description = this.status;
  }

  iconPath = {
    light: path.join(__filename, "..", "resources", "env0-icon.svg"),
    dark: path.join(__filename, "..", "resources", "env0-icon.svg"),
  };
}

