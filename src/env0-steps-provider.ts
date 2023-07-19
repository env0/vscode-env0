import * as vscode from "vscode";

export class StepsViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  // eslint-disable-next-line no-useless-constructor
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    const steps = [
      { header: "Step 1", content: "Step 1 content goes here." },
      { header: "Step 2", content: "Step 2 content goes here." },
      { header: "Step 3", content: "Step 3 content goes here." },
    ];

    webviewView.webview.html = this.getWebviewContent(steps);
  }

  private getWebviewContent(
    steps: { header: string; content: string }[]
  ): string {
    const scriptUri = this._view?.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "index.js")
    );

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="${scriptUri}"></script>
          <style>
            .step {
              margin-bottom: 10px;
              cursor: pointer;
            }
            .step .header {
              font-weight: bold;
            }
            .step .content {
              display: none;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          ${steps
            .map(
              (step, index) => `
                <div class="step" id="step-${
                  index + 1
                }" onclick="toggleContent(${index + 1})">
                  <div class="header">${step.header}</div>
                  <div class="content">${step.content}</div>
                </div>
              `
            )
            .join("")}
        </body>
      </html>
    `;
  }
}
