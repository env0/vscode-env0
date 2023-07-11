import { AuthService } from "./auth";
import axios from "axios";
import { ENV0_API_URL, ENV0_WEB_URL } from "./common";

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
}
