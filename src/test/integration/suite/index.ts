import * as path from "path";

import * as jest from "jest";
export async function run() {
  const projectRootPath = path.resolve(__dirname, "../../../../");

  const config = path.resolve(projectRootPath, "jest.it.config.js");

  await jest.runCLI(
    {
      runInBand: true,
      cache: false,
      config,
    } as any,
    [projectRootPath]
  );
}
