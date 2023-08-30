import * as jestMock from "jest-mock";
import expect from "expect";
import axios from "axios";
// vscode mock must be imported before the tested module!!!
// eslint-disable-next-line @typescript-eslint/no-var-requires
import {
  contextMock,
  getRegisteredCommand,
  mockLogin,
  resetVscodeMocks,
} from "./mocks/vscode";
// eslint-disable-next-line import/first
import { AuthService } from "../../auth";

describe("authentication", () => {
  afterEach(() => {
    resetVscodeMocks();
  });

  it("should save login credentials in secret store", async () => {
    const keyId = "keyId";
    const secret = "secret";
    mockLogin(keyId, secret);
    // todo extract this
    axios.get = jestMock.fn<any>().mockResolvedValueOnce({ status: 200 });
    const auth = new AuthService(contextMock);
    const onLogin = jestMock.fn();
    auth.registerLoginCommand(onLogin);
    const loginCommand = getRegisteredCommand("env0.login");
    await loginCommand();
    expect(onLogin).toHaveBeenCalled();
    expect(contextMock.secrets.store).toHaveBeenCalledWith("env0.keyId", keyId);
    expect(contextMock.secrets.store).toHaveBeenCalledWith(
      "env0.secret",
      secret
    );
  });
});
