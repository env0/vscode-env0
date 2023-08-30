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
    withProgress: (options: any, task: any) => task(),
  },
};
mock("vscode", vscode);

export const mockLogin = (keyId: string, secret: string) => {
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
