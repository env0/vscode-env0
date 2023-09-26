import mock from "mock-require";
mock("strip-ansi", (str: string) => str);
