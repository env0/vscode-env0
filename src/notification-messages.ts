import * as vscode from "vscode";

const MORE_INFO_BUTTON = "More info";

export type LinkProps = {
  projectId: string;
  environmentId: string;
};

export const showSuccessMessage = (linkProps: LinkProps) => {
  const header = `Environment ${linkProps.environmentId} is ACTIVE!`;
  vscode.window
    .showInformationMessage(header, MORE_INFO_BUTTON)
    .then((button) => {
      addLinkToEnvironment(button, linkProps);
    });
};

export const showInProgressMessage = (linkProps: LinkProps) => {
  const header = `Environment ${linkProps.environmentId} is in progress...`;
  vscode.window
    .showInformationMessage(header, MORE_INFO_BUTTON)
    .then((button) => {
      addLinkToEnvironment(button, linkProps);
    });
};

export const showWaitingForApproval = (linkProps: LinkProps) => {
  const header = `Environment ${linkProps.environmentId} is waiting for approval`;
  vscode.window.showWarningMessage(header, MORE_INFO_BUTTON).then((button) => {
    addLinkToEnvironment(button, linkProps);
  });
};

export const showErrorMessage = (
  errorMessage: string | undefined,
  linkProps: LinkProps
) => {
  const message = `Deployment has failed for environment ${linkProps.environmentId}. Error: ${errorMessage}`;
  vscode.window.showErrorMessage(message, MORE_INFO_BUTTON).then((button) => {
    addLinkToEnvironment(button, linkProps);
  });
};

function addLinkToEnvironment(
  button: string | undefined,
  linkProps: LinkProps
) {
  const { projectId, environmentId } = linkProps;
  if (button === MORE_INFO_BUTTON) {
    vscode.env.openExternal(
      vscode.Uri.parse(
        `https://dev.dev.env0.com/p/${projectId}/environments/${environmentId}`
      )
    );
  }
}
