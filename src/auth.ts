import axios from "axios";
import * as vscode from "vscode";
import { ENV0_API_URL, ENV0_ENVIRONMENTS_VIEW_ID } from "./common";
import {
  showInvalidCredentialsMessage,
  showUnexpectedErrorMessage,
} from "./notification-messages";

const env0KeyIdKey = "env0.keyId";
const env0SecretKey = "env0.secret";

export class AuthService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private selectedOrgId: string | undefined;

  public getSelectedOrg() {
    return this.selectedOrgId;
  }

  public registerLoginCommand(onLogin: () => void) {
    const disposable = vscode.commands.registerCommand(
      "env0.login",
      async () => {
        if (await this.isLoggedIn()) {
          await vscode.window.showInformationMessage(
            "You are already logged in."
          );
          return;
        }
        const keyId = await vscode.window.showInputBox({
          ignoreFocusOut: true,
          placeHolder: "API Key ID",
          prompt: "Enter your API Key ID.",
          password: true,
          validateInput: (token) => {
            if (!token) {
              return "API Key ID cannot be empty";
            }
            return null;
          },
        });

        const secret = await vscode.window.showInputBox({
          ignoreFocusOut: true,
          placeHolder: "API Key Secret",
          prompt: "Enter your API Key Secret.",
          password: true,
          validateInput: (token) => {
            if (!token) {
              return "API Key Secret cannot be empty";
            }
            return null;
          },
        });

        const selectedOrgId = await this.pickOrganization(keyId!, secret!);
        if (selectedOrgId) {
          this.selectedOrgId = selectedOrgId;
          await this.storeAuthData(keyId!, secret!);
          await onLogin();
        }
      }
    );
    this.context.subscriptions.push(disposable);
  }

  public registerLogoutCommand(onLogOut: () => void) {
    const disposable = vscode.commands.registerCommand(
      "env0.logout",
      async () => {
        await onLogOut();
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

  private async pickOrganization(keyId: string, secret: string) {
    // Displaying a loading indicator to inform the user that something is happening
    return await vscode.window.withProgress(
      { location: { viewId: ENV0_ENVIRONMENTS_VIEW_ID } },
      async () => {
        try {
          const orgsRes = await axios.get(
            `https://${ENV0_API_URL}/organizations`,
            {
              auth: { username: keyId, password: secret },
              validateStatus: function (status) {
                return status >= 200 && status < 300;
              },
            }
          );
          if (orgsRes.data.length === 1) {
            return orgsRes.data[0].id;
          }
          const orgs = orgsRes.data.map((org: any) => ({
            name: org.name,
            id: org.id,
          }));
          const items: vscode.QuickPickItem[] = orgs.map((org: any) => ({
            label: org.name,
            description: org.id,
          }));

          const selectedItem = await vscode.window.showQuickPick(items, {
            placeHolder: "Select an organization",
          });
          const selectedOrgId = selectedItem?.description;
          if (!selectedOrgId) {
            vscode.window.showErrorMessage("No organization selected");
            return undefined;
          }
          return selectedOrgId;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          if (e?.response?.status >= 400 && e?.response?.status < 500) {
            showInvalidCredentialsMessage();
          } else {
            showUnexpectedErrorMessage();
          }
          return undefined;
        }
      }
    );
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
