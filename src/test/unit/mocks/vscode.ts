import mock from "mock-require";
export const vscode = { commands: {}, window: {} };
mock("vscode", vscode);
