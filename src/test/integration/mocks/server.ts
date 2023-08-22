import assert from "assert";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { before, after, afterEach } from "mocha";
import { ENV0_API_URL } from "../../../common";
import { EnvironmentModel } from "../../../get-environments";
import {
  Credentials,
  DeploymentStatus,
  DeploymentStepLogsResponse,
  DeploymentStepResponse,
} from "../../../types";

const server = setupServer(
  rest.all(`*`, (_req, res, ctx) => {
    return res(ctx.status(200));
  })
);

const assertAuth = (credentials: Credentials, authHeader: string | null) => {
  if (!authHeader) {
    throw new Error("no auth header");
  }
  const authBase64 = authHeader.split("Basic ")[1];
  const [keyId, secret] = atob(authBase64 || "").split(":");
  assert.strictEqual(keyId, credentials.keyId);
  assert.strictEqual(secret, credentials.secret);
};

export const mockGetOrganization = (
  organizationId: string,
  credentials?: Credentials
) => {
  server.use(
    rest.get(`https://${ENV0_API_URL}/organizations`, (req, res, ctx) => {
      if (credentials) {
        assertAuth(credentials, req.headers.get("Authorization"));
      }
      return res(ctx.json([{ id: organizationId }]));
    })
  );
};

export const mockGetEnvironment = (
  organizationId: string,
  environments: EnvironmentModel[],
  credentials?: Credentials
) => {
  server.use(
    rest.get(`https://${ENV0_API_URL}/environments`, (req, res, ctx) => {
      if (credentials) {
        assertAuth(credentials, req.headers.get("Authorization"));
      }
      if (
        new URL(req.url.toString()).searchParams.get("organizationId") ===
        organizationId
      ) {
        return res(ctx.json(environments));
      }
      return res(ctx.status(404));
    })
  );
};

export const mockGetDeploymentStepsApiResponse = (
  steps: DeploymentStepResponse = []
) => {
  server.use(
    rest.get(
      `https://${ENV0_API_URL}/deployments/:deploymentLogId/steps`,
      (req, res, ctx) => {
        return res(ctx.json(steps));
      }
    )
  );
};

export const mockRedeployApiResponse = (
  envId: string,
  credentials: Credentials,
  onSuccess?: () => unknown
) => {
  server.use(
    rest.post(
      `https://${ENV0_API_URL}/environments/${envId}/deployments`,
      (req, res, ctx) => {
        if (credentials) {
          assertAuth(credentials, req.headers.get("Authorization"));
        }
        onSuccess?.();
        return res(ctx.json({}));
      }
    )
  );
};

export const mockApproveApiResponse = (
  deploymentId: string,
  credentials: Credentials,
  onSuccess?: () => unknown
) => {
  server.use(
    rest.put(
      `https://${ENV0_API_URL}/environments/deployments/${deploymentId}`,
      (req, res, ctx) => {
        if (credentials) {
          assertAuth(credentials, req.headers.get("Authorization"));
        }
        onSuccess?.();
        return res(ctx.json({}));
      }
    )
  );
};

export const mockCancelApiResponse = (
  deploymentId: string,
  credentials: Credentials,
  onSuccess?: () => unknown
) => {
  server.use(
    rest.put(
      `https://${ENV0_API_URL}/environments/deployments/${deploymentId}/cancel`,
      (req, res, ctx) => {
        if (credentials) {
          assertAuth(credentials, req.headers.get("Authorization"));
        }
        onSuccess?.();
        return res(ctx.json({}));
      }
    )
  );
};
export const mockGetDeploymentApiResponse = (
  deploymentLogId: string,
  credentials: Credentials,
  deployment: { status: string },
  onSuccess?: () => unknown
) => {
  server.use(
    rest.get(
      `https://${ENV0_API_URL}/environments/deployments/${deploymentLogId}`,
      (req, res, ctx) => {
        if (credentials) {
          assertAuth(credentials, req.headers.get("Authorization"));
        }
        onSuccess?.();
        return res(ctx.json(deployment));
      }
    )
  );
};

export const mockGetDeploymentLogApiResponse = ({
  deploymentLogId,
  deploymentLog,
  stepName,
  stepStartTime,
  credentials,
  onSuccess,
}: {
  deploymentLogId: string;
  deploymentLog: DeploymentStepLogsResponse;
  stepName: string;
  stepStartTime?: string;
  credentials?: Credentials;
  onSuccess?: () => unknown;
}) => {
  server.use(
    rest.get(
      `https://${ENV0_API_URL}/deployments/${deploymentLogId}/steps/${stepName}/log?startTime=${
        stepStartTime ?? ""
      }`,
      (req, res, ctx) => {
        if (credentials) {
          assertAuth(credentials, req.headers.get("Authorization"));
        }
        onSuccess?.();
        return res(ctx.json(deploymentLog));
      }
    )
  );
};

export const mockDeploymentLogsResponses = async (
  deploymentId: string,
  auth: Credentials,
  steps: {
    [stepName: string]: string[];
  },
  deploymentStatus: DeploymentStatus = DeploymentStatus.SUCCESS
) => {
  mockGetDeploymentApiResponse(deploymentId, auth, {
    status: deploymentStatus,
  });

  const stepNames = Object.keys(steps);
  mockGetDeploymentStepsApiResponse(stepNames.map((name) => ({ name } as any)));

  for (const [stepName, messages] of Object.entries(steps)) {
    mockGetDeploymentLogApiResponse({
      deploymentLogId: deploymentId,
      credentials: auth,
      stepName,
      deploymentLog: {
        events: messages.map((message) => ({ message } as any)),
        hasMoreLogs: false,
      },
    });
  }
};

before(() => {
  server.listen();
});
afterEach(() => server.resetHandlers());
after(() => server.close());
