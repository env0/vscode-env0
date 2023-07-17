import { AuthService } from "./auth";
import axios from "axios";
import { ENV0_API_URL, ENV0_WEB_URL } from "./common";
import { EnvironmentModel } from "./get-environments";
import { DeploymentStepLogsResponse, DeploymentStepResponse } from "./types";

class ApiClient {
  private credentials?: { username: string; password: string };

  public init(credentials: { username: string; password: string }) {
    this.credentials = credentials;
  }

  public async abortDeployment(deploymentId: string) {
    return axios.post(
      `https://${ENV0_API_URL}/environments/deployments/${deploymentId}/abort`,
      {},
      { auth: this.credentials }
    );
  }

  public async redeployEnvironment(envId: string) {
    return axios.post(
      `https://${ENV0_API_URL}/environments/${envId}/deployments`,
      {},
      { auth: this.credentials }
    );
  }

  public async cancelDeployment(deploymentId: string) {
    return axios.put(
      `https://${ENV0_API_URL}/environments/deployments/${deploymentId}/cancel`,
      undefined,
      {
        auth: this.credentials,
      }
    );
  }

  public async resumeDeployment(deploymentId: string) {
    return axios.put(
      `https://${ENV0_API_URL}/environments/deployments/${deploymentId}`,
      undefined,
      {
        auth: this.credentials,
      }
    );
  }

  public async destroyEnvironment(deploymentId: string) {
    axios.post(
      `https://${ENV0_API_URL}/environments/${deploymentId}/destroy`,
      {},
      { auth: this.credentials }
    );
  }

  public async getEnvironments(organizationId: string) {
    const res = await axios.get<EnvironmentModel[]>(
      `https://${ENV0_API_URL}/environments`,
      {
        params: { organizationId },
        auth: this.credentials,
      }
    );

    return res.data;
  }

  public async getOrganizations() {
    const res = await axios.get(`https://${ENV0_API_URL}/organizations`, {
      auth: this.credentials,
    });
    return res.data;
  }

  public async getDeploymentSteps(deploymentLogId: string) {
    const response = await axios.get<DeploymentStepResponse>(
      `https://${ENV0_API_URL}/deployments/${deploymentLogId}/steps`,
      {
        auth: this.credentials,
      }
    );
    return response.data;
  }

  public async getDeploymentStepLogs(
    deploymentLogId: string,
    stepName: string,
    stepStartTime?: string | number
  ) {
    const response = await axios.get<DeploymentStepLogsResponse>(
      `https://${ENV0_API_URL}/deployments/${deploymentLogId}/steps/${stepName}/log?startTime=${
        stepStartTime ?? ""
      }`,
      {
        auth: this.credentials,
      }
    );
    return response.data;
  }
}

export const apiClient = new ApiClient();
