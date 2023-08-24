import * as vscode from "vscode";
import { ModuleMocker } from "jest-mock";
const mock = new ModuleMocker(global);

let logs: string[] = [];

export const getOutputChannelLogs = () => logs;
export const outputChannelMock = {
  show: mock.fn(),
  clear: mock.fn(() => (logs = [])),
  appendLine: (value: string) => logs.push(value),
};

export const mockOutputChannel = () => {
  mock
    .spyOn(vscode.window, "createOutputChannel")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockImplementation(() => outputChannelMock as any);
};

export const resetOutputChannelMocks = () => {
  mock.resetAllMocks();
};
