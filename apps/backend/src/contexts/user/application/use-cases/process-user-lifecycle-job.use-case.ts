import { UserId, EventId } from '@awdah/shared';
import {
  IUserLifecycleJobRepository,
  UserLifecycleJob,
  UserLifecycleJobType,
} from '../../domain/repositories/user-lifecycle-job.repository';
import type { IUserDataLifecycleService } from '../../domain/services/user-data-lifecycle.service.interface';
import type { IDeletedUsersRepository } from '../../domain/repositories/deleted-users.repository';

const DELETED_USER_TOMBSTONE_RETENTION_DAYS = 120;
const EXPORT_CONTENT_TYPE = 'application/json;charset=utf-8';
const DEFAULT_ERROR_MESSAGE = 'Unexpected lifecycle job failure';

export type LifecycleJobHandler = (userId: UserId, jobId: EventId) => Promise<UserLifecycleJob>;

export interface ProcessUserLifecycleJobCommand {
  userId: UserId;
  jobId: EventId;
}

export class ProcessUserLifecycleJobUseCase {
  constructor(
    private readonly jobRepository: IUserLifecycleJobRepository,
    private readonly userDataLifecycleService: IUserDataLifecycleService,
    private readonly deletedUsersRepository: IDeletedUsersRepository,
  ) {}

  async execute(command: ProcessUserLifecycleJobCommand): Promise<UserLifecycleJob | null> {
    const startedAt = new Date().toISOString();
    const job = await this.jobRepository.tryMarkProcessing(
      command.userId,
      command.jobId,
      startedAt,
    );

    if (!job) {
      return null;
    }

    const handler = this.getJobHandler(job.type, startedAt, job.expiresAt);

    try {
      return await handler(command.userId, command.jobId);
    } catch (error) {
      await this.jobRepository.markFailed(
        command.userId,
        command.jobId,
        new Date().toISOString(),
        error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
      );
      throw error;
    }
  }

  private getJobHandler(
    jobType: UserLifecycleJobType,
    startedAt: string,
    expiresAt: number,
  ): LifecycleJobHandler {
    const handlerByType: Record<UserLifecycleJobType, LifecycleJobHandler> = {
      [UserLifecycleJobType.Export]: (userId, jobId) =>
        this.handleExport(userId, jobId, startedAt, expiresAt),
      [UserLifecycleJobType.ResetPrayers]: (userId, jobId) =>
        this.handleResetPrayers(userId, jobId),
      [UserLifecycleJobType.ResetFasts]: (userId, jobId) => this.handleResetFasts(userId, jobId),
      [UserLifecycleJobType.DeleteAccount]: (userId, jobId) =>
        this.handleDeleteAccount(userId, jobId),
    };

    const handler = handlerByType[jobType];
    if (!handler) {
      throw new Error(`Unsupported job type: ${jobType}`);
    }

    return handler;
  }

  private async handleExport(
    userId: UserId,
    jobId: EventId,
    startedAt: string,
    expiresAt: number,
  ): Promise<UserLifecycleJob> {
    const data = await this.userDataLifecycleService.exportUserData(userId);
    const datePart = startedAt.split('T')[0];
    const exportFileName = `awdah-data-export-${datePart}.json`;

    const { chunkCount } = await this.jobRepository.saveExportResult(userId, jobId, {
      fileName: exportFileName,
      contentType: EXPORT_CONTENT_TYPE,
      data,
      expiresAt,
    });

    return this.jobRepository.markCompleted(userId, jobId, {
      completedAt: new Date().toISOString(),
      exportFileName,
      exportContentType: EXPORT_CONTENT_TYPE,
      exportChunkCount: chunkCount,
    });
  }

  private async handleResetPrayers(userId: UserId, jobId: EventId): Promise<UserLifecycleJob> {
    await this.userDataLifecycleService.resetPrayerLogs(userId);
    return this.jobRepository.markCompleted(userId, jobId, {
      completedAt: new Date().toISOString(),
    });
  }

  private async handleResetFasts(userId: UserId, jobId: EventId): Promise<UserLifecycleJob> {
    await this.userDataLifecycleService.resetFastLogs(userId);
    return this.jobRepository.markCompleted(userId, jobId, {
      completedAt: new Date().toISOString(),
    });
  }

  private async handleDeleteAccount(userId: UserId, jobId: EventId): Promise<UserLifecycleJob> {
    await this.userDataLifecycleService.deleteUserData(userId);

    const expiresAt =
      Math.floor(Date.now() / 1000) + DELETED_USER_TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60;

    await this.deletedUsersRepository.recordDeletion(userId, new Date().toISOString(), expiresAt);

    return this.jobRepository.markCompleted(userId, jobId, {
      completedAt: new Date().toISOString(),
      authCleanupRequired: true,
      authDeleted: false,
    });
  }
}
