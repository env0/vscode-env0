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
import { onLogsPollingError } from "./errors";

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
          onLogsPollingError(e);
        }
      });
    } else {
      this.logDeployment(this.env.latestDeploymentLogId).catch((e) => {
        if (!axios.isCancel(e)) {
          onLogsPollingError(e);
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
    const stepsToLog = await this.getStepsToLog(deploymentId);

    const stepsEvents = stepsToLog.map(async (step) => ({
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

  private async waitForDeploymentToStart(deploymentId: string) {
    this.log("Deployment is queued! Waiting for it to start...");
    await sleep(pollStepLogsInterval);

    while (!this.isAborted) {
      const { status } = await apiClient.getDeployment(
        deploymentId,
        this.abortController
      );

      if (status === DeploymentStatus.QUEUED) {
        this.log(
          "Queued deployment is still waiting for earlier deployments to finish..."
        );
      }

      if (status === DeploymentStatus.IN_PROGRESS) {
        this.log("Deployment is starting...");
        return;
      }

      await sleep(pollStepLogsInterval);
    }
  }

  private async logInProgressDeployment(deploymentId: string) {
    const { status } = await apiClient.getDeployment(
      deploymentId,
      this.abortController
    );

    if (status === DeploymentStatus.QUEUED) {
      await this.waitForDeploymentToStart(deploymentId);
    }

    if (this.isAborted) {
      return;
    }

    await this.processDeploymentSteps(deploymentId);

    const { status: newStatus } = await apiClient.getDeployment(
      deploymentId,
      this.abortController
    );

    if (newStatus === "WAITING_FOR_USER") {
      this.log("Deployment is waiting for an approval.");
    }
  }

  private async getStepsToLog(deploymentId: string) {
    const steps = await apiClient.getDeploymentSteps(
      deploymentId,
      this.abortController
    );
    return steps.filter((step) => !this.stepsAlreadyLogged.includes(step.name));
  }

  private async processDeploymentSteps(deploymentId: string) {
    do {
      if (await this.checkIfDeploymentIsCompleted(deploymentId)) {
        return this.logCompletedDeployment(deploymentId);
      }
      const stepsToLog = await this.getStepsToLog(deploymentId);
      if (stepsToLog.length === 0) {
        await sleep(pollStepLogsInterval);
        continue;
      }
      for (const step of stepsToLog) {
        await this.writeDeploymentStepLog(deploymentId, step.name);
        this.stepsAlreadyLogged.push(step.name);
        if (await this.checkIfDeploymentIsCompleted(deploymentId)) {
          return this.logCompletedDeployment(deploymentId);
        }
      }
    } while (!this.isAborted);
  }

  private async checkIfDeploymentIsCompleted(deploymentId: string) {
    const { status } = await apiClient.getDeployment(
      deploymentId,
      this.abortController
    );
    return ![DeploymentStatus.IN_PROGRESS, DeploymentStatus.QUEUED].includes(
      status
    );
  }

  private async waitForStepToStart(
    deploymentLogId: string,
    stepName: string
  ): Promise<void> {
    let shouldPoll = true;
    do {
      const steps = await apiClient.getDeploymentSteps(
        deploymentLogId,
        this.abortController
      );

      const { status } = steps.find((step) => step.name === stepName) || {};
      shouldPoll = status === DeploymentStepStatus.NOT_STARTED;
      if (shouldPoll) {
        await sleep(pollStepLogsInterval);
      }
    } while (shouldPoll);
  }

  private async writeDeploymentStepLog(
    deploymentLogId: string,
    stepName: string
  ) {
    let shouldPoll = false;
    let startTime: number | string | undefined;
    await this.waitForStepToStart(deploymentLogId, stepName);
    this.log(`$$$ ${stepName}`);
    this.log("#".repeat(100));
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
