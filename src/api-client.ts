import { AuthService } from "./auth";
import axios from "axios";
import { ENV0_API_URL, ENV0_WEB_URL } from "./common";
import { EnvironmentModel } from "./get-environments";
import { DeploymentStepLogsResponse, DeploymentStepResponse } from "./types";

export class ApiClient {
  constructor(private readonly authService: AuthService) {}
  public async abortDeployment(deploymentId: string) {
    return axios.post(
      `https://${ENV0_API_URL}/environments/deployments/${deploymentId}/abort`,
      {},
      { auth: await this.authService.getApiKeyCredentials() }
    );
  }

  public async redeployEnvironment(envId: string) {
    return axios.post(
      `https://${ENV0_API_URL}/environments/${envId}/deployments`,
      {},
      { auth: await this.authService.getApiKeyCredentials() }
    );
  }

  public async cancelDeployment(deploymentId: string) {
    return axios.put(
      `https://${ENV0_API_URL}/environments/deployments/${deploymentId}/cancel`,
      undefined,
      {
        auth: await this.authService.getApiKeyCredentials(),
      }
    );
  }

  public async resumeDeployment(deploymentId: string) {
    return axios.put(
      `https://${ENV0_API_URL}/environments/deployments/${deploymentId}`,
      undefined,
      {
        auth: await this.authService.getApiKeyCredentials(),
      }
    );
  }

  public async destroyEnvironment(deploymentId: string) {
    axios.post(
      `https://${ENV0_API_URL}/environments/${deploymentId}/destroy`,
      {},
      { auth: await this.authService.getApiKeyCredentials() }
    );
  }

  public async getEnvironments(organizationId: string) {
    const res = await axios.get<EnvironmentModel[]>(
      `https://${ENV0_API_URL}/environments`,
      {
        params: { organizationId },
        auth: await this.authService.getApiKeyCredentials(),
      }
    );

    return res.data;
  }

  public async getOrganizations() {
    const res = await axios.get(`https://${ENV0_API_URL}/organizations`, {
      auth: await this.authService.getApiKeyCredentials(),
    });
    return res.data;
  }

  public async getDeploymentSteps(deploymentLogId: string) {
    const response = await axios.get<DeploymentStepResponse>(
      `https://${ENV0_API_URL}/deployments/${deploymentLogId}/steps`,
      {
        auth: await this.authService.getApiKeyCredentials(),
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
        auth: await this.authService.getApiKeyCredentials(),
      }
    );
    return response.data;
  }
}
