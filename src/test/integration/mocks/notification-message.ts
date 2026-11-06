import * as jestMock from "jest-mock";
import * as vscode from "vscode";
import { waitFor } from "../suite/test-utils";
import expect from "expect";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AsyncSpy = jestMock.MockInstance<(...args: any[]) => Promise<any>>;

let showInformationMessageSpy: AsyncSpy;
let showErrorMessageSpy: AsyncSpy;
let showWarningMessageSpy: AsyncSpy;

let openExternalSpy: AsyncSpy;

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
  ) as unknown as AsyncSpy;
  showErrorMessageSpy = jestMock.spyOn(
    vscode.window,
    "showErrorMessage"
  ) as unknown as AsyncSpy;
  showWarningMessageSpy = jestMock.spyOn(
    vscode.window,
    "showWarningMessage"
  ) as unknown as AsyncSpy;
};

export const assertInfoMessageDisplayed = async (message: string) => {
  // wait for setInterval to invoke Environments provider state refresh
  await waitFor(() => expect(showInformationMessageSpy).toHaveBeenCalled());
  expect(showInformationMessageSpy).toHaveBeenCalledWith(message, "More info");
};

export const assertErrorMessageDisplayed = async (message: string) => {
  // wait for setInterval to invoke Environments provider state refresh
  await waitFor(() => expect(showErrorMessageSpy).toHaveBeenCalled());
  expect(showErrorMessageSpy).toHaveBeenCalledWith(message, "More info");
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
  showInformationMessageSpy.mockReturnValue(Promise.resolve("More info"));
};

/**
 * Simulates the scenario where the "More info" button is clicked
 * in an error message. When this button is clicked, the
 * `showErrorMessage` function resolves with a string representing
 * the clicked button.
 */
export const simulateErrorMessageMoreInfoButtonClicked = () => {
  showErrorMessageSpy.mockReturnValue(Promise.resolve("More info"));
};

/**
 * Simulates the scenario where the "More info" button is clicked
 * in a warning message. When this button is clicked, the
 * `showWarningMessage` function resolves with a string representing
 * the clicked button.
 */
export const simulateWarningMessageMoreInfoButtonClicked = () => {
  showWarningMessageSpy.mockReturnValue(Promise.resolve("More info"));
};

// since in the tests we don't have a real uri, we need to mock it
const spyOnParseUri = () => {
  const uriParseSpy = jestMock.spyOn(vscode.Uri, "parse");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uriParseSpy.mockImplementation((url) => url as any);
};

export const spyOnOpenExternal = () => {
  spyOnParseUri();
  openExternalSpy = jestMock.spyOn(
    vscode.env,
    "openExternal"
  ) as unknown as AsyncSpy;
  openExternalSpy.mockReturnValue(Promise.resolve(true));
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
