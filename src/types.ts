export type DeploymentStepType =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "WAITING_FOR_USER"
  | "TIMEOUT"
  | "FAIL"
  | "SUCCESS"
  | "CANCELLED"
  | "SKIPPED";

export interface DeploymentStep {
  id: string;
  deploymentLogId: string;
  name: string;
  order: number;
  projectId: string;
  organizationId: string;
  status: DeploymentStepType;
  startedAt?: string;
  completedAt?: string;
}

export type DeploymentStepResponse = DeploymentStep[];

export interface DeploymentStepLog {
  eventId: string;
  message: string;
  level: string;
  timestamp: string | number;
}

export interface DeploymentStepLogsResponse {
  events: DeploymentStepLog[];
  nextStartTime?: number | string;
  hasMoreLogs: boolean;
}

export interface Credentials {
  keyId: string;
  secret: string;
}

export enum DeploymentStatus {
  IN_PROGRESS = "IN_PROGRESS",
  FAILURE = "FAILURE",
  SUCCESS = "SUCCESS",
  TIMEOUT = "TIMEOUT",
  INTERNAL_FAILURE = "INTERNAL_FAILURE",
  CANCELLED = "CANCELLED",
  ABORTED = "ABORTED",
  ABORTING = "ABORTING",
  QUEUED = "QUEUED",
  SKIPPED = "SKIPPED",
}

export enum DeploymentStepStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  WAITING_FOR_USER = "WAITING_FOR_USER",
  FAIL = "FAIL",
  SUCCESS = "SUCCESS",
  CANCELLED = "CANCELLED",
  TIMEOUT = "TIMEOUT",
  SKIPPED = "SKIPPED",
}
