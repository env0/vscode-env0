import * as jestMock from "jest-mock";
import expect from "expect";
// vscode mock must be imported before the tested module!!!
import {
  contextMock,
  executeRegisteredCommand,
  mockLogin,
  resetVscodeMocks,
} from "./mocks/vscode";
import { AuthService } from "../../auth";
import { mockValidateCredentialsRequest } from "./mocks/http";

describe("authentication", () => {
  afterEach(() => {
    resetVscodeMocks();
  });

  it("should save login credentials in secrets store", async () => {
    const keyId = "keyId";
    const secret = "secret";
    const onLogin = jestMock.fn();
    const auth = new AuthService(contextMock);
    auth.registerLoginCommand(onLogin);

    mockLogin(keyId, secret);
    mockValidateCredentialsRequest({ keyId, secret });
    await executeRegisteredCommand("env0.login");

    expect(onLogin).toHaveBeenCalled();
    expect(contextMock.secrets.store).toHaveBeenCalledWith("env0.keyId", keyId);
    expect(contextMock.secrets.store).toHaveBeenCalledWith(
      "env0.secret",
      secret
    );
  });

  it("should not save login credentials in secrets store when credentials invalid", async () => {
    const keyId = "keyId";
    const secret = "secret";
    const onLogin = jestMock.fn();
    const auth = new AuthService(contextMock);
    auth.registerLoginCommand(onLogin);

    mockLogin(keyId, "invalid secret");
    mockValidateCredentialsRequest({ keyId, secret });
    await executeRegisteredCommand("env0.login");

    expect(contextMock.secrets.store).not.toHaveBeenCalled();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("should delete login credentials from secrets store when logout", async () => {
    const onLogout = jestMock.fn();
    const auth = new AuthService(contextMock);
    auth.registerLogoutCommand(onLogout);

    await executeRegisteredCommand("env0.logout");

    expect(onLogout).toHaveBeenCalled();
    expect(contextMock.secrets.delete).toHaveBeenCalledWith("env0.keyId");
    expect(contextMock.secrets.delete).toHaveBeenCalledWith("env0.secret");
  });
});
