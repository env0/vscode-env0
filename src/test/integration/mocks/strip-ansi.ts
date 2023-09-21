import mock from "mock-require";

export const mockStripAnsi = () => {
  mock("strip-ansi", (str: string) => str);
};
