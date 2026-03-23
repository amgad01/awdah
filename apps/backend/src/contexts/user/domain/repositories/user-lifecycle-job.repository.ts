import type { UserDataExport } from '../services/user-data-lifecycle.service.interface';

export const USER_LIFECYCLE_JOB_TYPES = ['export', 'delete-account'] as const;
export type UserLifecycleJobType = (typeof USER_LIFECYCLE_JOB_TYPES)[number];

export const USER_LIFECYCLE_JOB_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;
export type UserLifecycleJobStatus = (typeof USER_LIFECYCLE_JOB_STATUSES)[number];

export const USER_LIFECYCLE_JOB_TTL_SECONDS = 24 * 60 * 60;

export interface UserLifecycleJob {
  userId: string;
  jobId: string;
  type: UserLifecycleJobType;
  status: UserLifecycleJobStatus;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  expiresAt: number;
  exportFileName?: string;
  exportContentType?: string;
  exportChunkCount?: number;
  authCleanupRequired?: boolean;
  authDeleted?: boolean;
  authCleanupCompletedAt?: string;
}

export interface CreateUserLifecycleJobInput {
  userId: string;
  jobId: string;
  type: UserLifecycleJobType;
  requestedAt: string;
  expiresAt: number;
  authCleanupRequired?: boolean;
  authDeleted?: boolean;
}

export interface CompleteUserLifecycleJobInput {
  completedAt: string;
  exportFileName?: string;
  exportContentType?: string;
  exportChunkCount?: number;
  authCleanupRequired?: boolean;
  authDeleted?: boolean;
}

export interface SaveUserLifecycleExportResultInput {
  fileName: string;
  contentType: string;
  data: UserDataExport;
  expiresAt: number;
}

export interface UserLifecycleExportDownload {
  fileName: string;
  contentType: string;
  data: UserDataExport;
}

export interface IUserLifecycleJobRepository {
  createJob(input: CreateUserLifecycleJobInput): Promise<UserLifecycleJob>;
  findById(userId: string, jobId: string): Promise<UserLifecycleJob | null>;
  tryMarkProcessing(
    userId: string,
    jobId: string,
    startedAt: string,
  ): Promise<UserLifecycleJob | null>;
  markCompleted(
    userId: string,
    jobId: string,
    input: CompleteUserLifecycleJobInput,
  ): Promise<UserLifecycleJob>;
  markFailed(
    userId: string,
    jobId: string,
    completedAt: string,
    errorMessage: string,
  ): Promise<void>;
  saveExportResult(
    userId: string,
    jobId: string,
    input: SaveUserLifecycleExportResultInput,
  ): Promise<{ chunkCount: number }>;
  readExportResult(userId: string, jobId: string): Promise<UserLifecycleExportDownload | null>;
  markAuthDeleted(userId: string, jobId: string, completedAt: string): Promise<UserLifecycleJob>;
}
