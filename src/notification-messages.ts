import * as vscode from "vscode";
import { ENV0_WEB_URL } from "./common";

const MORE_INFO_BUTTON = "More info";

export type LinkProps = {
  projectId: string;
  environmentId: string;
  environmentName: string;
};

export const showSuccessMessage = (linkProps: LinkProps) => {
  const header = `Environment ${linkProps.environmentName} is ACTIVE!`;
  vscode.window
    .showInformationMessage(header, MORE_INFO_BUTTON)
    .then((button) => {
      addLinkToEnvironment(button, linkProps);
    });
};

export const showInProgressMessage = (linkProps: LinkProps) => {
  const header = `Environment ${linkProps.environmentName} is in progress...`;
  vscode.window
    .showInformationMessage(header, MORE_INFO_BUTTON)
    .then((button) => {
      addLinkToEnvironment(button, linkProps);
    });
};

export const showWaitingForApproval = (linkProps: LinkProps) => {
  const header = `Environment ${linkProps.environmentName} is waiting for approval`;
  vscode.window.showWarningMessage(header, MORE_INFO_BUTTON).then((button) => {
    addLinkToEnvironment(button, linkProps);
  });
};

export const showErrorMessage = (
  errorMessage: string | undefined,
  linkProps: LinkProps
) => {
  const message = `Deployment has failed for environment ${linkProps.environmentName}. Error: ${errorMessage}`;
  vscode.window.showErrorMessage(message, MORE_INFO_BUTTON).then((button) => {
    addLinkToEnvironment(button, linkProps);
  });
};

export const showInvalidCredentialsMessage = () => {
  vscode.window.showErrorMessage(
    "Invalid key ID or key secret. Please check your credentials."
  );
};

export const showUnexpectedErrorMessage = () => {
  vscode.window.showErrorMessage(
    "An unexpected error occurred. Please try again later."
  );
};

function addLinkToEnvironment(
  button: string | undefined,
  linkProps: LinkProps
) {
  const { projectId, environmentId } = linkProps;
  if (button === MORE_INFO_BUTTON) {
    vscode.env.openExternal(
      vscode.Uri.parse(
        `https://${ENV0_WEB_URL}/p/${projectId}/environments/${environmentId}`
      )
    );
  }
}
