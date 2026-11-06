import * as jestMock from "jest-mock";
import * as vscode from "vscode";

let quickPickSpy: jestMock.MockInstance<any>;
export const spyOnQuickPick = () => {
  quickPickSpy = jestMock.spyOn(vscode.window, "showQuickPick");
  return quickPickSpy;
};

export const resetSpyOnQuickPick = () => {
  quickPickSpy?.mockReset?.();
};
