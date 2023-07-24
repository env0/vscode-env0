import assert from "assert";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { before, after, afterEach } from "mocha";
import { ENV0_API_URL } from "../../../common";
import { EnvironmentModel } from "../../../get-environments";

const server = setupServer(
  rest.all(`*`, (_req, res, ctx) => {
    return res(ctx.status(200));
  })
);

const assertAuth = (
  auth: { keyId: string; secret: string },
  authHeader: string | null
) => {
  if (!authHeader) {
    throw new Error("no auth header");
  }
  const authBase64 = authHeader.split("Basic ")[1];
  const [keyId, secret] = atob(authBase64 || "").split(":");
  assert.strictEqual(keyId, auth.keyId);
  assert.strictEqual(secret, auth.secret);
};

export const mockGetOrganization = (
  organizationId: string,
  auth?: {
    keyId: string;
    secret: string;
  }
) => {
  server.use(
    rest.get(`https://${ENV0_API_URL}/organizations`, (req, res, ctx) => {
      if (auth) {
        assertAuth(auth, req.headers.get("Authorization"));
      }
      return res(ctx.json([{ id: organizationId }]));
    })
  );
};
export const mockGetEnvironment = (
  organizationId: string,
  environments: EnvironmentModel[]
) => {
  server.use(
    rest.get(`https://${ENV0_API_URL}/environments`, (req, res, ctx) => {
      if (
        new URL(req.url as any).searchParams.get("organizationId") ===
        organizationId
      ) {
        return res(ctx.json(environments));
      }
      return res(ctx.status(404));
    })
  );
};
before(() => {
  server.listen();
});
afterEach(() => server.resetHandlers());
after(() => server.close());
