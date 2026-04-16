import { UserId, EventId } from '@awdah/shared';
import type { UserDataExport } from '../services/user-data-lifecycle.service.interface';

export const UserLifecycleJobType = {
  Export: 'export',
  DeleteAccount: 'delete-account',
  ResetPrayers: 'reset-prayers',
  ResetFasts: 'reset-fasts',
} as const;
export type UserLifecycleJobType = (typeof UserLifecycleJobType)[keyof typeof UserLifecycleJobType];

export const UserLifecycleJobStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
} as const;
export type UserLifecycleJobStatus =
  (typeof UserLifecycleJobStatus)[keyof typeof UserLifecycleJobStatus];

export function isExportJob(job: UserLifecycleJob): boolean {
  return job.type === UserLifecycleJobType.Export;
}

export function isDeleteAccountJob(job: UserLifecycleJob): boolean {
  return job.type === UserLifecycleJobType.DeleteAccount;
}

export function isResetPrayersJob(job: UserLifecycleJob): boolean {
  return job.type === UserLifecycleJobType.ResetPrayers;
}

export function isResetFastsJob(job: UserLifecycleJob): boolean {
  return job.type === UserLifecycleJobType.ResetFasts;
}

export const USER_LIFECYCLE_JOB_TTL_SECONDS = 24 * 60 * 60;

export interface UserLifecycleJob {
  userId: UserId;
  jobId: EventId;
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
  userId: UserId;
  jobId: EventId;
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
  findById(userId: UserId, jobId: EventId): Promise<UserLifecycleJob | null>;
  tryMarkProcessing(
    userId: UserId,
    jobId: EventId,
    startedAt: string,
  ): Promise<UserLifecycleJob | null>;
  markCompleted(
    userId: UserId,
    jobId: EventId,
    input: CompleteUserLifecycleJobInput,
  ): Promise<UserLifecycleJob>;
  markFailed(
    userId: UserId,
    jobId: EventId,
    completedAt: string,
    errorMessage: string,
  ): Promise<void>;
  saveExportResult(
    userId: UserId,
    jobId: EventId,
    input: SaveUserLifecycleExportResultInput,
  ): Promise<{ chunkCount: number }>;
  readExportResult(userId: UserId, jobId: EventId): Promise<UserLifecycleExportDownload | null>;
  markAuthDeleted(userId: UserId, jobId: EventId, completedAt: string): Promise<UserLifecycleJob>;
}
