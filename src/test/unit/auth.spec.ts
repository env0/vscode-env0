import * as jestMock from "jest-mock";
import expect from "expect";
// vscode mock must be imported before the tested module!!!
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { vscode } = require("./mocks/vscode");
// eslint-disable-next-line import/first
import { AuthService } from "../../auth";

describe("authentication", () => {
  it("should save login credentials in secret store", async () => {
    let registerCommand: string;
    let registeredLoginCommand: () => any;
    const keyId = "keyId";
    const secret = "secret";
    vscode.commands = {
      registerCommand: (command: string, onCommand: () => any) => {
        registerCommand = command;
        registeredLoginCommand = onCommand;
      },
    };
    vscode.window = {
      showInformationMessage: jestMock.fn(),
      showInputBox: jestMock
        .fn<any>()
        .mockResolvedValueOnce(keyId)
        .mockResolvedValueOnce(secret),
      withProgress: jestMock.fn(),
    };
    const context = {
      subscriptions: [],
      secrets: { get: () => {} },
    };
    const auth = new AuthService(context as any);
    const onLogin = jestMock.fn();
    auth.registerLoginCommand(onLogin);
    expect(registerCommand!).toBe("env0.login");
    await registeredLoginCommand!();
    expect(onLogin).toHaveBeenCalled();
  });
});
