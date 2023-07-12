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
