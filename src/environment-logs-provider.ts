import * as vscode from "vscode";
import { Environment } from "./env0-environments-provider";
import { apiClient } from "./api-client";
import stripAnsi from "strip-ansi";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const pollStepLogsInterval = 1000;
const pollableStatuses = ["IN_PROGRESS", "QUEUED"];

export class EnvironmentLogsProvider {
  private static environmentLogsOutputChannel: vscode.OutputChannel;
  private readonly abortController = new AbortController();
  private _isAborted = false;
  private readonly stepsAlreadyLogged: string[] = [];
  constructor(private readonly env: Environment) {
    this.logDeployment(this.env.latestDeploymentLogId).catch((e) => {
      if (!axios.isCancel(e)) {
        throw e;
      }
    });
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
    EnvironmentLogsProvider.environmentLogsOutputChannel.show();
    let previousStatus;

    const deployment = await apiClient.getDeployment(
      deploymentId,
      this.abortController
    );
    if (deployment.status === "QUEUED") {
      this.log(`Deployment is queued! Waiting for it to start...`);
    }

    while (true && !this.isAborted) {
      const { type, status } = await apiClient.getDeployment(
        deploymentId,
        this.abortController
      );

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

      await this.processDeploymentSteps(deploymentId);

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

  private async processDeploymentSteps(deploymentId: string) {
    const steps = await apiClient.getDeploymentSteps(
      deploymentId,
      this.abortController
    );

    for (const step of steps) {
      const alreadyLogged = this.stepsAlreadyLogged.includes(step.name);

      if (!alreadyLogged && step.status !== "NOT_STARTED") {
        this.log(`$$$ ${step.name}`);
        this.log("#".repeat(100));
        await this.writeDeploymentStepLog(deploymentId, step.name);

        this.stepsAlreadyLogged.push(step.name);
      }
    }
  }

  private async writeDeploymentStepLog(
    deploymentLogId: string,
    stepName: string
  ) {
    let shouldPoll = false;
    let startTime: number | string;

    do {
      const steps = await apiClient.getDeploymentSteps(
        deploymentLogId,
        this.abortController
      );

      const { status } = steps.find((step) => step.name === stepName) || {};
      const stepInProgress = status === "IN_PROGRESS";

      const { events, nextStartTime, hasMoreLogs } =
        await apiClient.getDeploymentStepLogs(
          deploymentLogId,
          stepName,
          startTime!,
          this.abortController
        );

      events.forEach((event) => this.log(stripAnsi(event.message)));

      if (nextStartTime) {
        startTime = nextStartTime;
      }

      if (stepInProgress) {
        await sleep(pollStepLogsInterval);
      }

      shouldPoll = hasMoreLogs || stepInProgress;
    } while (shouldPoll);
  }

  static initEnvironmentOutputChannel() {
    this.environmentLogsOutputChannel = vscode.window.createOutputChannel(
      `env0 logs`,
      "ansi"
    );
  }
}
