import path from "path";
import * as vscode from "vscode";

export class Env0PrettyPlanProvider
  implements vscode.TreeDataProvider<PrettyPlan | ResourceAttribute>
{
  setResourceChanges(resourceChanges: any[]) {
    this.resourceChanges = resourceChanges;
    console.log("setResourceChanges", resourceChanges);
    
    this.refresh();
    //throw new Error("Method not implemented.");
  }
  constructor() {
    this.PrettyPlans = [];
    this.resourceChanges = [];
  }
  private PrettyPlans: PrettyPlan[];
  private resourceChanges: any[];

  getTreeItem(element: PrettyPlan): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: PrettyPlan): Promise<PrettyPlan[]| ResourceAttribute[]> {
    // const envs = [{
    //   name:'a',status:'b', updatedAt: new Date().toDateString(), id:'id', projectId:'projectId'}]
    if (!element) {
      const envs = [
        {
          "name": "name",
          "providerName": "registry.terraform.io/hashicorp/null",
          "type": "null_resource",
          "path": "null_resource.null2",
          "action": "create",
          "attributes": [
            {
              "name": "id",
              "before": "",
              "after": "<computed>"
            }
          ]
        }
      ]
      this.PrettyPlans = envs.map(
        (env) =>
          new PrettyPlan(
            env.name,
            env.path,
            env.action,
            env.attributes,
            vscode.TreeItemCollapsibleState.Collapsed
          )
      );
  
      return Promise.resolve(this.PrettyPlans);

    } else {
      // const x: ResourceAttributeType = {
      //   name: "foo",
      //   before: "bar",
      //   after: "baz"
      // } 
      return Promise.resolve(element.attributes.map(x=> new ResourceAttribute(x)))
    }

  }


  private _onDidChangeTreeData: vscode.EventEmitter<
    PrettyPlan | undefined | null | void
  > = new vscode.EventEmitter<PrettyPlan | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    PrettyPlan | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}
export type ResourceChanges = {
  name: string;
  type: string;
  path: string;
  action: string;
  attributes: ResourceAttributeType[];
}

type ResourceAttributeType = {
  name: string,
  before: string,
  after:string
};

class PrettyPlan extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly path: string,
    public readonly action: string,
    public readonly attributes: ResourceAttributeType[],
    public readonly resourceChanges: vscode.TreeItemCollapsibleState
  ) {
    super(`${action.toUpperCase()} || ${path} || ${name}`, vscode.TreeItemCollapsibleState.Collapsed);
    this.attributes = attributes;
    //this.description = `${action} | ${path}`;
    //this.tooltip = `last update at ${lastUpdated}`;
  }
}

class ResourceAttribute extends vscode.TreeItem {
  constructor(attribute: ResourceAttributeType) {
    super(attribute.name)
  }

}
