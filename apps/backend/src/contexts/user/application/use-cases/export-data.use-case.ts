import {
  IUserLifecycleJobRepository,
  USER_LIFECYCLE_JOB_TTL_SECONDS,
  type UserLifecycleJob,
} from '../../domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../domain/services/user-lifecycle-job-dispatcher.service.interface';
import { ulid } from 'ulid';

export interface ExportDataCommand {
  userId: string;
}

export class ExportDataUseCase {
  constructor(
    private readonly jobRepository: IUserLifecycleJobRepository,
    private readonly jobDispatcher: IUserLifecycleJobDispatcher,
  ) {}

  async execute(command: ExportDataCommand): Promise<UserLifecycleJob> {
    const requestedAt = new Date().toISOString();
    const job = await this.jobRepository.createJob({
      userId: command.userId,
      jobId: ulid(),
      type: 'export',
      requestedAt,
      expiresAt: Math.floor(Date.now() / 1000) + USER_LIFECYCLE_JOB_TTL_SECONDS,
    });

    await this.jobDispatcher.dispatch({
      userId: command.userId,
      jobId: job.jobId,
    });

    return job;
  }
}
