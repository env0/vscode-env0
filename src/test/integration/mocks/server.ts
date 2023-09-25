/* eslint-disable @typescript-eslint/no-explicit-any */
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
  orgs: { id: string; name: string }[],
  credentials?: Credentials
) => {
  server.use(
    rest.get(`https://${ENV0_API_URL}/organizations`, (req, res, ctx) => {
      if (credentials) {
        assertAuth(credentials, req.headers.get("Authorization"));
      }
      return res(ctx.json(orgs));
    })
  );
};

export const mockGetEnvironment = (
  organizationId: string,
  environments: EnvironmentModel[],
  credentials?: Credentials,
  responseDelayMs = 0
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
        return res(ctx.delay(responseDelayMs), ctx.json(environments));
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
  onSuccess?: () => unknown,
  newDeploymentId?: string
) => {
  server.use(
    rest.post(
      `https://${ENV0_API_URL}/environments/${envId}/deployments`,
      (req, res, ctx) => {
        if (credentials) {
          assertAuth(credentials, req.headers.get("Authorization"));
        }
        onSuccess?.();
        return res(
          ctx.json({ id: newDeploymentId || "redeploy-new-deployment-id" })
        );
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
  deploymentLogs,
  stepName,
  credentials,
}: {
  deploymentLogId: string;
  deploymentLogs: [DeploymentStepLogsResponse, DeploymentStepLogsResponse];
  stepName: string;
  stepStartTime?: string;
  credentials?: Credentials;
}) => {
  server.use(
    rest.get(
      `https://${ENV0_API_URL}/deployments/${deploymentLogId}/steps/${stepName}/log`,
      (req, res, ctx) => {
        if (credentials) {
          assertAuth(credentials, req.headers.get("Authorization"));
        }
        const startTimeParam = req.url.searchParams.get("startTime");
        if (!startTimeParam) {
          return res(ctx.json(deploymentLogs[0]));
        }
        if (startTimeParam === deploymentLogs[0].nextStartTime?.toString()) {
          return res(ctx.json(deploymentLogs[1]));
        }
        return res(ctx.json({}));
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
    const [firstMessage, ...restMessages] = messages;
    const nextStartTime = Date.now();
    mockGetDeploymentLogApiResponse({
      deploymentLogId: deploymentId,
      credentials: auth,
      stepName,
      deploymentLogs: [
        {
          events: [{ message: firstMessage } as any],
          hasMoreLogs: true,
          nextStartTime,
        },
        {
          events: restMessages.map((message) => ({ message } as any)),
          hasMoreLogs: false,
        },
      ],
    });
  }
};

export const mockAbortApiResponse = (
  deploymentId: string,
  credentials: Credentials,
  onSuccess?: () => unknown
) => {
  server.use(
    rest.post(
      `https://${ENV0_API_URL}/environments/deployments/${deploymentId}/abort`,
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

export const mockDestroyApiResponse = (
  envId: string,
  credentials: Credentials,
  onSuccess?: () => unknown
) => {
  server.use(
    rest.post(
      `https://${ENV0_API_URL}/environments/${envId}/destroy`,
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

before(() => {
  server.listen();
});
afterEach(() => server.resetHandlers());
after(() => server.close());
