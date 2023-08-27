import * as vscode from "vscode";
import { Environment } from "./env0-environments-provider";
import { apiClient } from "./api-client";
import stripAnsi from "strip-ansi";
import {
  DeploymentStatus,
  DeploymentStepLog,
  DeploymentStepStatus,
} from "./types";
import axios from "axios";
import { setMaxListeners } from "events";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const pollStepLogsInterval = 1000;

export class EnvironmentLogsProvider {
  private static environmentLogsOutputChannel: vscode.OutputChannel;
  private readonly abortController = new AbortController();
  private _isAborted = false;
  private readonly stepsAlreadyLogged: string[] = [];
  constructor(
    private readonly env: Environment,
    private readonly deploymentId?: string
  ) {
    // @ts-ignore
    setMaxListeners(20, this.abortController.signal);
    this.log("Loading logs...");
    if (this.deploymentId) {
      this.logDeployment(this.deploymentId).catch((e) => {
        if (!axios.isCancel(e)) {
          throw e;
        }
      });
    } else {
      this.logDeployment(this.env.latestDeploymentLogId).catch((e) => {
        if (!axios.isCancel(e)) {
          throw e;
        }
      });
    }
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

    const { status } = await apiClient.getDeployment(
      deploymentId,
      this.abortController
    );
    if (
      ![DeploymentStatus.QUEUED, DeploymentStatus.IN_PROGRESS].includes(status)
    ) {
      return this.logCompletedDeployment(deploymentId);
    }
    return this.logInProgressDeployment(deploymentId);
  }

  private async logCompletedDeployment(deploymentId: string) {
    const steps = await apiClient.getDeploymentSteps(
      deploymentId,
      this.abortController
    );

    const stepsEvents = steps.map(async (step) => ({
      name: step.name,
      events: await this.getStepLogs(deploymentId, step.name),
    }));

    for await (const step of stepsEvents) {
      this.log(`$$$ ${step.name}`);
      this.log("#".repeat(100));
      step.events.forEach((event) => this.log(stripAnsi(event.message)));
    }
  }

  private async getStepLogs(
    deploymentId: string,
    stepName: string,
    startTime?: string | number
  ): Promise<DeploymentStepLog[]> {
    const { events, nextStartTime, hasMoreLogs } =
      await apiClient.getDeploymentStepLogs(
        deploymentId,
        stepName,
        startTime,
        this.abortController
      );
    let result = [...events];
    if (hasMoreLogs && nextStartTime) {
      result = result.concat(
        await this.getStepLogs(deploymentId, stepName, nextStartTime)
      );
    }
    return result;
  }

  private async logInProgressDeployment(deploymentId: string) {
    let previousStatus;

    while (!this.isAborted) {
      const { type, status } = await apiClient.getDeployment(
        deploymentId,
        this.abortController
      );

      if (status === DeploymentStatus.QUEUED) {
        if (previousStatus === DeploymentStatus.QUEUED) {
          this.log(
            "Queued deployment is still waiting for earlier deployments to finish..."
          );
        } else {
          this.log("Deployment is queued! Waiting for it to start...");
        }
        previousStatus = status;
        await sleep(pollStepLogsInterval);
        continue;
      }

      if (
        status === DeploymentStatus.IN_PROGRESS &&
        previousStatus === DeploymentStatus.QUEUED
      ) {
        this.log(`Deployment reached its turn! ${type} is starting...`);
      }

      await this.processDeploymentSteps(deploymentId);

      if (
        ![DeploymentStatus.QUEUED, DeploymentStatus.IN_PROGRESS].includes(
          status
        )
      ) {
        if (status === "WAITING_FOR_USER") {
          this.log("Deployment is waiting for an approval.");
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

      if (!alreadyLogged && step.status !== DeploymentStepStatus.NOT_STARTED) {
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
    let startTime: number | string | undefined;

    do {
      const steps = await apiClient.getDeploymentSteps(
        deploymentLogId,
        this.abortController
      );

      const { status } = steps.find((step) => step.name === stepName) || {};
      const isStepInProgress = status === DeploymentStatus.IN_PROGRESS;

      const { events, nextStartTime, hasMoreLogs } =
        await apiClient.getDeploymentStepLogs(
          deploymentLogId,
          stepName,
          startTime,
          this.abortController
        );

      events.forEach((event) => this.log(stripAnsi(event.message)));

      if (nextStartTime) {
        startTime = nextStartTime;
      }

      if (isStepInProgress) {
        await sleep(pollStepLogsInterval);
      }

      shouldPoll = hasMoreLogs || isStepInProgress;
    } while (shouldPoll);
  }

  static initEnvironmentOutputChannel() {
    this.environmentLogsOutputChannel = vscode.window.createOutputChannel(
      `env0 logs`,
      "ansi"
    );
  }
}
