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

export enum EnvironmentStatus {
  CREATED = "CREATED",
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  FAILED = "FAILED",
  TIMEOUT = "TIMEOUT",
  WAITING_FOR_USER = "WAITING_FOR_USER",
  DEPLOY_IN_PROGRESS = "DEPLOY_IN_PROGRESS",
  DESTROY_IN_PROGRESS = "DESTROY_IN_PROGRESS",
  PR_PLAN_IN_PROGRESS = "PR_PLAN_IN_PROGRESS",
  REMOTE_PLAN_IN_PROGRESS = "REMOTE_PLAN_IN_PROGRESS",
  DRIFT_DETECTION_IN_PROGRESS = "DRIFT_DETECTION_IN_PROGRESS",
  TASK_IN_PROGRESS = "TASK_IN_PROGRESS",
  ABORTING = "ABORTING",
  ABORTED = "ABORTED",
  NEVER_DEPLOYED = "NEVER_DEPLOYED",
  DRIFTED = "DRIFTED",
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
