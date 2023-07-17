// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TestEnvironment } = require("jest-environment-node");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const vscode = require("vscode");

class VsCodeEnvironment extends TestEnvironment {
  async setup() {
    this.global.vscode = vscode;
    await super.setup();
  }

  async teardown() {
    this.global.vscode = {};
    await super.teardown();
  }
}

module.exports = VsCodeEnvironment;
