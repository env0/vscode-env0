import * as jestMock from "jest-mock";
import * as vscode from "vscode";
import { waitFor } from "../suite/test-utils";
import expect from "expect";
import { mockStripAnsi } from "./strip-ansi";
// mock strip-ansi should be imported before the errors module!!!
mockStripAnsi();
// eslint-disable-next-line import/first
import {
  cannotGetDefaultBranchMessage,
  getDefaultBranchErrorMessage,
} from "../../../errors";

let showInformationMessageSpy: jestMock.SpyInstance<
  typeof vscode.window.showInformationMessage
>;
let showErrorMessageSpy: jestMock.SpyInstance<
  typeof vscode.window.showErrorMessage
>;
let showWarningMessageSpy: jestMock.SpyInstance<
  typeof vscode.window.showWarningMessage
>;

let openExternalSpy: jestMock.SpyInstance<typeof vscode.env.openExternal>;

export const resetShowMessageSpies = () => {
  showInformationMessageSpy.mockReset();
  showErrorMessageSpy.mockReset();
  showWarningMessageSpy.mockReset();
};

// since we can't get the value of the message from vscode, we need to spy on it
export const spyOnShowMessage = () => {
  showInformationMessageSpy = jestMock.spyOn(
    vscode.window,
    "showInformationMessage"
  );
  showErrorMessageSpy = jestMock.spyOn(vscode.window, "showErrorMessage");
  showWarningMessageSpy = jestMock.spyOn(vscode.window, "showWarningMessage");
};

export const assertInfoMessageDisplayed = async (message: string) => {
  // wait for setInterval to invoke Environments provider state refresh
  await waitFor(() => expect(showInformationMessageSpy).toHaveBeenCalled());
  expect(showInformationMessageSpy).toHaveBeenCalledWith(message, "More info");
};

export const assertErrorMessageDisplayed = async (message: string) => {
  await waitFor(() => {
    const calls = showErrorMessageSpy.mock.calls.filter(
      (call) =>
        !(
          call[0].startsWith(cannotGetDefaultBranchMessage) ||
          call[0].startsWith(getDefaultBranchErrorMessage)
        )
    );
    expect(calls[0][0]).toBe(message);
    expect(calls[0][1]).toBe("more info");
  });
};

export const assertWarningMessageDisplayed = async (message: string) => {
  // wait for setInterval to invoke Environments provider state refresh
  await waitFor(() => expect(showWarningMessageSpy).toHaveBeenCalled());
  expect(showWarningMessageSpy).toHaveBeenCalledWith(message, "More info");
};

/**
 * Simulates the scenario where the "More info" button is clicked
 * in an informational message. When this button is clicked, the
 * `showInformationMessage` function resolves with a string representing
 * the clicked button.
 */
export const simulateInfoMessageMoreInfoButtonClicked = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showInformationMessageSpy.mockResolvedValue("More info" as any);
};

/**
 * Simulates the scenario where the "More info" button is clicked
 * in an error message. When this button is clicked, the
 * `showErrorMessage` function resolves with a string representing
 * the clicked button.
 */
export const simulateErrorMessageMoreInfoButtonClicked = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showErrorMessageSpy.mockResolvedValue("More info" as any);
};

/**
 * Simulates the scenario where the "More info" button is clicked
 * in a warning message. When this button is clicked, the
 * `showWarningMessage` function resolves with a string representing
 * the clicked button.
 */
export const simulateWarningMessageMoreInfoButtonClicked = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showWarningMessageSpy.mockResolvedValue("More info" as any);
};

// since in the tests we don't have a real uri, we need to mock it
const spyOnParseUri = () => {
  const uriParseSpy = jestMock.spyOn(vscode.Uri, "parse");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uriParseSpy.mockImplementation((url) => url as any);
};

export const spyOnOpenExternal = () => {
  spyOnParseUri();
  openExternalSpy = jestMock.spyOn(vscode.env, "openExternal");
  openExternalSpy.mockResolvedValue(true);
};

export const resetOpenExternalSpy = () => {
  openExternalSpy.mockReset();
};

export const assertOpenEnvironmentInBrowserWhenMoreInfoClicked = async (
  envId: string,
  projectId: string
) => {
  await waitFor(() => expect(openExternalSpy).toHaveBeenCalled());
  expect(openExternalSpy).toHaveBeenCalledWith(
    expect.stringContaining(`/p/${projectId}/environments/${envId}`)
  );
};
