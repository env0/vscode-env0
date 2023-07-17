const path = require("path");

module.exports = {
  moduleFileExtensions: ["js"],
  verbose: true,
  testMatch: ["<rootDir>/out/test/integration/suite/**.test.it.js"],
  modulePathIgnorePatterns: ["node_modules/"],
  testEnvironment: "<rootDir>/out/test/integration/vscode-env.js",
  moduleNameMapper: {
    vscode: path.join(__dirname, "src", "test", "integration", "vscode.js"),
  },
};
