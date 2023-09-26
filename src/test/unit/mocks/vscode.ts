/* eslint-disable @typescript-eslint/no-explicit-any */
import mock from "mock-require";
import { ModuleMocker } from "jest-mock";
const mocker = new ModuleMocker(global);
const registeredCommands: Record<string, () => any> = {};
export const vscode = {
  commands: {
    registerCommand: (command: string, onCommand: () => any) => {
      registeredCommands[command] = onCommand;
    },
  },
  window: {
    showErrorMessage: mocker.fn(),
    showInformationMessage: mocker.fn(),
    showInputBox: mocker.fn(),
    withProgress: mocker
      .fn()
      .mockImplementation((options: any, task: any) => task()),
  },
  workspace: {
    getConfiguration: () => ({
      get: mocker.fn(),
    }),
  },
  extensions: {
    getExtension: mocker.fn(),
  },
  TreeItem: class {},
};

mock("vscode", vscode);

export const mockLoginCredentialsInput = (keyId: string, secret: string) => {
  vscode.window.showInputBox = mocker
    .fn<any>()
    .mockResolvedValueOnce(keyId)
    .mockResolvedValueOnce(secret);
};

export const contextMock = {
  subscriptions: [],
  secrets: { get: mocker.fn(), store: mocker.fn(), delete: mocker.fn() },
} as any;

export const resetVscodeMocks = () => {
  mocker.resetAllMocks();
};

export const executeRegisteredCommand = (command: string) => {
  return registeredCommands[command]();
};
