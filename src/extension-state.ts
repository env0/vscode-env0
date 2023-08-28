import * as vscode from "vscode";
import { Environment } from "./env0-environments-provider";

export class ExtensionState {
  private environmentsView?: vscode.TreeView<Environment>;
  init(environmentsView: vscode.TreeView<Environment>) {
    this.environmentsView = environmentsView;
  }

  private _isLoggedIn = false;
  private _noEnvironment = false;
  private _currentBranch: string | undefined;
  private _failedToGetBranch = false;
  private _isLoading = false;
  get isLoggedIn() {
    return this._isLoggedIn;
  }

  setIsLoading(isLoading: boolean) {
    if (this._isLoading === isLoading) {
      return;
    }
    this._isLoading = isLoading;
    this.updateViewMessage();
  }

  setLoggedIn(isLoggedIn: boolean) {
    if (this._isLoggedIn === isLoggedIn) {
      return;
    }
    this._isLoggedIn = isLoggedIn;
    if (!isLoggedIn) {
      this._failedToGetBranch = false;
      this._noEnvironment = false;
    }
    this.updateViewMessage();
  }

  setNoEnvironment(noEnvironment: boolean) {
    if (this._noEnvironment === noEnvironment) {
      return;
    }
    this._noEnvironment = noEnvironment;
    this.updateViewMessage();
  }

  onFailedToGetBranch() {
    this._currentBranch = undefined;
    this._failedToGetBranch = true;
    this.updateViewMessage();
  }

  setCurrentBranch(currentBranch: string) {
    this._currentBranch = currentBranch;
    this._failedToGetBranch = false;
    this.updateViewMessage();
  }

  updateViewMessage() {
    if (!this.environmentsView) {
      return;
    }
    const currentBranch = this._currentBranch;
    if (!this._isLoggedIn) {
      this.environmentsView.message =
        "you are logged out. in order to log in, run the command 'env0.login'";
    } else if (this._failedToGetBranch) {
      this.environmentsView.message = "Could not find current git branch.";
    } else if (this._noEnvironment) {
      this.environmentsView.message = `couldn’t find environments associated with current branch${
        currentBranch ? ` "${currentBranch}"` : ""
      }`;
    } else if (this._isLoading) {
      this.environmentsView.message = `loading environments${
        currentBranch ? ` for branch ${currentBranch}` : ""
      }...`;
    } else {
      this.environmentsView.message = undefined;
    }
  }
}
export const extensionState = new ExtensionState();
