const path = require("path");

module.exports = {
  roots: ["<rootDir>"],
  moduleFileExtensions: ["js"],
  verbose: true,
  testMatch: ["<rootDir>/out/test/integration/suite/**.test.it.js"],
  modulePathIgnorePatterns: ["node_modules/"],
  testEnvironment: "<rootDir>/out/test/integration/vscode-env.js",
};
