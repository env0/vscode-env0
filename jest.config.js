/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
  testEnvironment: "node",

  clearMocks: true,

  coverageProvider: "v8",

  testMatch: ["**/src/test/unit/**/*.test.ts"],

  testPathIgnorePatterns: ["/node_modules/"],

  transform: {
    "^.+\\.ts?$": "ts-jest",
    "^.+\\.js$": ["babel-jest", { configFile: "./babel.config.js" }],
  },
  transformIgnorePatterns: ["node_modules/(?!strip-ansi)/"],
  preset: "ts-jest",
};
