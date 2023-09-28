import axios, { AxiosInstance } from "axios";
import { ENV0_API_URL } from "./common";
import { EnvironmentModel } from "./get-environments";
import { DeploymentStepLogsResponse, DeploymentStepResponse } from "./types";
import { AuthService } from "./auth";

class ApiClient {
  private readonly instance: AxiosInstance;
  private authService?: AuthService;
  constructor() {
    this.instance = axios.create({ baseURL: `https://${ENV0_API_URL}` });
    this.instance.interceptors.request.use((config) => {
      const credentials = this.authService?.getCredentials();
      if (credentials) {
        config.auth = {
          username: credentials.username,
          password: credentials.password,
        };
      }
      return config;
    });
  }

  public init(authService: AuthService) {
    this.authService = authService;
  }

  public async abortDeployment(deploymentId: string) {
    const response = await this.instance.post<null>(
      `/environments/deployments/${deploymentId}/abort`,
      {}
    );
    return response.data;
  }

  public async redeployEnvironment(envId: string) {
    const response = await this.instance.post<{ id: string }>(
      `/environments/${envId}/deployments`,
      {}
    );
    return response.data;
  }

  public async cancelDeployment(deploymentId: string) {
    const response = await this.instance.put<{ id: string }>(
      `/environments/deployments/${deploymentId}/cancel`
    );
    return response.data;
  }

  public async resumeDeployment(deploymentId: string) {
    const response = await this.instance.put<{ id: string }>(
      `/environments/deployments/${deploymentId}`
    );
    return response.data;
  }

  public async destroyEnvironment(envId: string) {
    const response = await this.instance.post<{ id: string }>(
      `/environments/${envId}/destroy`,
      {}
    );
    return response.data;
  }

  public async getEnvironments() {
    const response = await this.instance.get<EnvironmentModel[]>(
      `/environments`,
      {
        params: {
          organizationId: this.authService?.getCredentials().selectedOrgId,
          isActive: true,
        },
      }
    );

    return response.data;
  }

  public async getOrganizations() {
    const response = await this.instance.get(`/organizations`);
    return response.data;
  }

  public async getDeployment(
    deploymentLogId: string,
    abortController?: AbortController
  ) {
    const response = await this.instance.get(
      `environments/deployments/${deploymentLogId}`,
      { signal: abortController?.signal }
    );
    return response.data;
  }

  public async getDeploymentSteps(
    deploymentLogId: string,
    abortController?: AbortController
  ) {
    const response = await this.instance.get<DeploymentStepResponse>(
      `/deployments/${deploymentLogId}/steps`,
      { signal: abortController?.signal }
    );
    return response.data;
  }

  public async getDeploymentStepLogs(
    deploymentLogId: string,
    stepName: string,
    stepStartTime?: string | number,
    abortController?: AbortController
  ) {
    const response = await this.instance.get<DeploymentStepLogsResponse>(
      `/deployments/${deploymentLogId}/steps/${stepName}/log?startTime=${
        stepStartTime ?? ""
      }`,
      { signal: abortController?.signal }
    );
    return response.data;
  }
}

export const apiClient = new ApiClient();
