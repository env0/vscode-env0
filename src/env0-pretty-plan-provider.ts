import path from "path";
import * as vscode from "vscode";

export class Env0PrettyPlanProvider
  implements vscode.TreeDataProvider<PrettyPlan | ResourceAttribute>
{
  setResourceChanges(resourceChanges: any[]) {
    this.resourceChanges = resourceChanges;    
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
      this.PrettyPlans = this.resourceChanges?.map(
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
    super(`${getActionIcon(action.toUpperCase())} ${path} || ${name}`, vscode.TreeItemCollapsibleState.Collapsed);
    this.attributes = attributes;
  }
}

function getActionIcon(action: string) {
  switch(action) {
    case 'DELETE':
      return '🔴';
    case 'CREATE':
      return '🟢';
    case 'UPDATE':
      return '🟡';
  }
  return '❓'
}

class ResourceAttribute extends vscode.TreeItem {
  constructor(attribute: ResourceAttributeType) {
    super(`${attribute.name}: "${attribute.before}" -> ${attribute.after ?? 'null'}`)
  }

}
