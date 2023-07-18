import { AuthService } from "./auth";
import axios, { AxiosInstance } from "axios";
import { ENV0_API_URL, ENV0_WEB_URL } from "./common";
import { EnvironmentModel } from "./get-environments";
import { DeploymentStepLogsResponse, DeploymentStepResponse } from "./types";

class ApiClient {
  private credentials?: { username: string; password: string };
  private readonly instance: AxiosInstance;
  constructor() {
    this.instance = axios.create({ baseURL: `https://${ENV0_API_URL}` });
    this.instance.interceptors.request.use((config) => {
      if (this.credentials) {
        config.auth = this.credentials;
      }
      return config;
    });
  }

  public init(credentials: { username: string; password: string }) {
    this.credentials = credentials;
  }

  public async abortDeployment(deploymentId: string) {
    return this.instance.post(
      `/environments/deployments/${deploymentId}/abort`,
      {}
    );
  }

  public async redeployEnvironment(envId: string) {
    return this.instance.post(`/environments/${envId}/deployments`, {});
  }

  public async cancelDeployment(deploymentId: string) {
    return this.instance.put(
      `/environments/deployments/${deploymentId}/cancel`
    );
  }

  public async resumeDeployment(deploymentId: string) {
    return this.instance.put(`/environments/deployments/${deploymentId}`);
  }

  public async destroyEnvironment(deploymentId: string) {
    this.instance.post(`/environments/${deploymentId}/destroy`, {});
  }

  public async getEnvironments(organizationId: string) {
    const res = await this.instance.get<EnvironmentModel[]>(`/environments`, {
      params: { organizationId },
    });

    return res.data;
  }

  public async getOrganizations() {
    const res = await this.instance.get(`/organizations`);
    return res.data;
  }

  public async getDeploymentSteps(deploymentLogId: string) {
    const response = await this.instance.get<DeploymentStepResponse>(
      `/deployments/${deploymentLogId}/steps`
    );
    return response.data;
  }

  public async getDeploymentStepLogs(
    deploymentLogId: string,
    stepName: string,
    stepStartTime?: string | number
  ) {
    const response = await this.instance.get<DeploymentStepLogsResponse>(
      `/deployments/${deploymentLogId}/steps/${stepName}/log?startTime=${
        stepStartTime ?? ""
      }`
    );
    return response.data;
  }
}

export const apiClient = new ApiClient();
