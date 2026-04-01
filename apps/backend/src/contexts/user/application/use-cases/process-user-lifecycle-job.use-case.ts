import type {
  IUserLifecycleJobRepository,
  UserLifecycleJob,
} from '../../domain/repositories/user-lifecycle-job.repository';
import type { IUserDataLifecycleService } from '../../domain/services/user-data-lifecycle.service.interface';
import type { IDeletedUsersRepository } from '../../domain/repositories/deleted-users.repository';

const DELETED_USER_TOMBSTONE_RETENTION_DAYS = 120;

export interface ProcessUserLifecycleJobCommand {
  userId: string;
  jobId: string;
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

    try {
      if (job.type === 'export') {
        const data = await this.userDataLifecycleService.exportUserData(command.userId);
        const exportFileName = `awdah-data-export-${startedAt.split('T')[0]}.json`;
        const { chunkCount } = await this.jobRepository.saveExportResult(
          command.userId,
          command.jobId,
          {
            fileName: exportFileName,
            contentType: 'application/json;charset=utf-8',
            data,
            expiresAt: job.expiresAt,
          },
        );

        return this.jobRepository.markCompleted(command.userId, command.jobId, {
          completedAt: new Date().toISOString(),
          exportFileName,
          exportContentType: 'application/json;charset=utf-8',
          exportChunkCount: chunkCount,
        });
      }

      if (job.type === 'reset-prayers') {
        await this.userDataLifecycleService.resetPrayerLogs(command.userId);
        return this.jobRepository.markCompleted(command.userId, command.jobId, {
          completedAt: new Date().toISOString(),
        });
      }

      if (job.type === 'reset-fasts') {
        await this.userDataLifecycleService.resetFastLogs(command.userId);
        return this.jobRepository.markCompleted(command.userId, command.jobId, {
          completedAt: new Date().toISOString(),
        });
      }

      await this.userDataLifecycleService.deleteUserData(command.userId);

      const expiresAt =
        Math.floor(Date.now() / 1000) + DELETED_USER_TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60;
      await this.deletedUsersRepository.recordDeletion(
        command.userId,
        new Date().toISOString(),
        expiresAt,
      );

      return this.jobRepository.markCompleted(command.userId, command.jobId, {
        completedAt: new Date().toISOString(),
        authCleanupRequired: true,
        authDeleted: false,
      });
    } catch (error) {
      await this.jobRepository.markFailed(
        command.userId,
        command.jobId,
        new Date().toISOString(),
        error instanceof Error ? error.message : 'Unexpected lifecycle job failure',
      );
      throw error;
    }
  }
}
