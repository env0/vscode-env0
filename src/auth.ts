import * as vscode from "vscode";

const env0KeyIdKey = "env0.keyId";
const env0SecretKey = "env0.secret";

export class AuthService {
  public onAuth?: () => any = undefined;
  constructor(private readonly context: vscode.ExtensionContext) {}
  public registerLoginCommand() {
    const disposable = vscode.commands.registerCommand(
      "env0.login",
      async () => {
        const keyId = await vscode.window.showInputBox({
          ignoreFocusOut: true,
          placeHolder: "API Key ID	",
          prompt: "Enter your API Key ID.",
          password: true,
          validateInput: (token) => {
            if (!token) {
              // todo better message
              return "The entered token has an invalid format.";
            }
            return null;
          },
        });

        const secret = await vscode.window.showInputBox({
          ignoreFocusOut: true,
          placeHolder: "secret key",
          prompt: "Enter your API Key Secret.",
          password: true,
          validateInput: (token) => {
            if (!token) {
              // todo better message
              return "The entered token has an invalid format.";
            }
            return null;
          },
        });
        await this.storeAuthData(keyId!, secret!);
        this.onAuth?.();
      }
    );
    this.context.subscriptions.push(disposable);
  }

  public registerLogoutCommand() {
    const disposable = vscode.commands.registerCommand(
      "env0.logout",
      async () => {
        this.clearAuthData();
      }
    );
    this.context.subscriptions.push(disposable);
  }

  public async isLoggedIn() {
    const { secret, keyId } = await this.getAuthData();
    return !!(secret && keyId);
  }

  public async getApiKeyCredentials() {
    const { secret, keyId } = await this.getAuthData();
    if (!secret || !keyId) {
      throw new Error("Could not read env0 api key values");
    }
    return { username: keyId, password: secret };
  }

  private async getAuthData() {
    return {
      keyId: await this.context.secrets.get(env0KeyIdKey),
      secret: await this.context.secrets.get(env0SecretKey),
    };
  }

  private async storeAuthData(keyId: string, secret: string) {
    await this.context.secrets.store(env0KeyIdKey, keyId);
    await this.context.secrets.store(env0SecretKey, secret);
  }

  private async clearAuthData() {
    await this.context.secrets.delete(env0KeyIdKey);
    await this.context.secrets.delete(env0SecretKey);
  }
}
