import axios from "axios";
import * as vscode from "vscode";
import { ENV0_API_URL, ENV0_ENVIRONMENTS_VIEW_ID } from "./common";
import {
  showInvalidCredentialsMessage,
  showUnexpectedErrorMessage,
} from "./notification-messages";

const env0KeyIdStoreKey = "env0.keyId";
const env0SecretStoreKey = "env0.secret";
const selectedOrgIdStoreKey = "env0.selectedOrgId";

export class AuthService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private credentials?: {
    username: string;
    password: string;
    selectedOrgId: string;
  };

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
          await this.storeAuthData(keyId!, secret!, selectedOrgId);
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
    const { secret, keyId, selectedOrgId } = await this.getAuthData();
    if (!(secret && keyId && selectedOrgId)) {
      return false;
    }
    this.credentials = { username: keyId, password: secret, selectedOrgId };
    return true;
  }

  public getCredentials() {
    if (!this.credentials) {
      // this should happen only if the user is logged out
      throw new Error("Could not read credentials");
    }

    return this.credentials;
  }

  private async getAuthData() {
    return {
      keyId: await this.context.secrets.get(env0KeyIdStoreKey),
      secret: await this.context.secrets.get(env0SecretStoreKey),
      selectedOrgId: await this.context.secrets.get(selectedOrgIdStoreKey),
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
            ignoreFocusOut: true,
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

  private async storeAuthData(
    keyId: string,
    secret: string,
    selectedOrgId: string
  ) {
    this.credentials = { username: keyId, password: secret, selectedOrgId };
    await this.context.secrets.store(env0KeyIdStoreKey, keyId);
    await this.context.secrets.store(env0SecretStoreKey, secret);
    await this.context.secrets.store(selectedOrgIdStoreKey, selectedOrgId);
  }

  private async clearAuthData() {
    await this.context.secrets.delete(env0KeyIdStoreKey);
    await this.context.secrets.delete(env0SecretStoreKey);
    await this.context.secrets.delete(selectedOrgIdStoreKey);
  }
}
