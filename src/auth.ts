import * as vscode from 'vscode';

export const getApiKeyCredentials = () => {
    const configurationWorkspace = vscode.workspace.getConfiguration()
    const env0ApiKey: string | undefined = configurationWorkspace.get("env0.apiKeyId")
    const env0SecretKey: string | undefined = configurationWorkspace.get("env0.secretKey")

    if(!env0ApiKey || !env0SecretKey) {
        throw new Error("Could not readt env0 api key values");
    }

    return { user: env0ApiKey, password: env0SecretKey }

}