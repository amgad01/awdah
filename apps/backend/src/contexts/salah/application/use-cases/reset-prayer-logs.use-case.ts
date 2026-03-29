import {
  IUserLifecycleJobRepository,
  USER_LIFECYCLE_JOB_TTL_SECONDS,
  type UserLifecycleJob,
} from '../../../user/domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../user/domain/services/user-lifecycle-job-dispatcher.service.interface';
import { ulid } from 'ulid';

export interface ResetPrayerLogsCommand {
  userId: string;
}

export class ResetPrayerLogsUseCase {
  constructor(
    private readonly jobRepository: IUserLifecycleJobRepository,
    private readonly jobDispatcher: IUserLifecycleJobDispatcher,
  ) {}

  async execute(command: ResetPrayerLogsCommand): Promise<UserLifecycleJob> {
    const requestedAt = new Date().toISOString();
    const job = await this.jobRepository.createJob({
      userId: command.userId,
      jobId: ulid(),
      type: 'reset-prayers',
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
