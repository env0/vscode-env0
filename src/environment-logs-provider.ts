import * as vscode from "vscode";
import { Environment } from "./env0-environments-provider";
import { apiClient } from "./api-client";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class EnvironmentLogsProvider {
  private static environmentLogsOutputChannel: vscode.OutputChannel;
  // todo pass abort signal to requests
  private readonly abortController = new AbortController();
  private _isAborted = false;
  constructor(private readonly env: Environment) {
    this.logDeployment(this.env.latestDeploymentLogId);
  }

  abort() {
    this.abortController.abort();
    this._isAborted = true;
    EnvironmentLogsProvider.environmentLogsOutputChannel.clear();
  }

  get isAborted() {
    return this._isAborted;
  }

  private log(value: string) {
    if (!this.isAborted) {
      const channel = EnvironmentLogsProvider.environmentLogsOutputChannel;
      if (!channel) {
        throw new Error(
          "environment logs output channel used before initialized"
        );
      }
      channel.appendLine(value);
    }
  }

  private async logDeployment(deploymentId: string) {
    const pollableStatuses = ["IN_PROGRESS", "QUEUED"]; // todo extract status to enum
    const pollStepLogsInterval = 5000; // todo maybe extract to const or env var
    const stepsAlreadyLogged: string[] = [];
    let previousStatus;

    const deployment = await apiClient.getDeployment(deploymentId);
    if (deployment.status === "QUEUED") {
      this.log(`Deployment is queued! Waiting for it to start...`);
    }

    while (true && !this.isAborted) {
      const { type, status } = await apiClient.getDeployment(deploymentId);

      if (status === "QUEUED" && previousStatus === "QUEUED") {
        this.log(
          "Queued deployment is still waiting for earlier deployments to finish..."
        );
      }

      if (status === "IN_PROGRESS" && previousStatus === "QUEUED") {
        this.log(
          `Deployment reached its turn! ${
            type === "deploy" ? "Deploying" : "Destroying"
          } environment...`
        );
      }

      stepsAlreadyLogged.push(
        ...(await this.processDeploymentSteps(deploymentId, stepsAlreadyLogged))
      );

      if (!pollableStatuses.includes(status)) {
        if (status === "WAITING_FOR_USER") {
          this.log(
            "Deployment is waiting for an approval. Run 'env0 approve' or 'env0 cancel' to continue."
          );
        }
        return status;
      }

      previousStatus = status;
      await sleep(pollStepLogsInterval);
    }
  }

  private async writeDeploymentStepLog(
    deploymentLogId: string,
    stepName: string
  ) {
    const pollInProgressStepLogInterval = 10000; // 10 seconds
    let shouldPoll = false;
    let startTime;

    do {
      const steps = await withRetry(() =>
        this.getDeploymentSteps(deploymentLogId)
      );
      const { status } = steps.find((step) => step.name === stepName);
      const stepInProgress = status === "IN_PROGRESS";

      const { events, nextStartTime, hasMoreLogs } = await withRetry(() =>
        this.getDeploymentStepLog(deploymentLogId, stepName, startTime)
      );

      events.forEach((event) => logger.info(event.message));

      if (nextStartTime) startTime = nextStartTime;
      if (stepInProgress) await apiClient.sleep(pollInProgressStepLogInterval);

      shouldPoll = hasMoreLogs || stepInProgress;
    } while (shouldPoll);
  }

  async processDeploymentSteps(deploymentId: string, stepsToSkip) {
    const doneSteps = [];

    const steps = await apiClient.getDeploymentSteps(deploymentId);

    for (const step of steps) {
      const alreadyLogged = stepsToSkip.includes(step.name);

      if (!alreadyLogged && step.status !== "NOT_STARTED") {
        this.log(`$$$ ${step.name}`);
        this.log("#".repeat(100));
        await this.writeDeploymentStepLog(deploymentId, step.name);

        doneSteps.push(step.name);
      }
    }

    return doneSteps;
  }

  static initEnvironmentOutputChannel() {
    this.environmentLogsOutputChannel = vscode.window.createOutputChannel(
      `env0 logs`,
      "ansi"
    );
  }
}
