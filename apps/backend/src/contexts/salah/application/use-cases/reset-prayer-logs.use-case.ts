import {
  IUserLifecycleJobRepository,
  USER_LIFECYCLE_JOB_TTL_SECONDS,
  type UserLifecycleJob,
} from '../../../user/domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../user/domain/services/user-lifecycle-job-dispatcher.service.interface';
import { UserId, EventId } from '@awdah/shared';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';

export interface ResetPrayerLogsCommand {
  userId: string;
}

export class ResetPrayerLogsUseCase {
  constructor(
    private readonly jobRepository: IUserLifecycleJobRepository,
    private readonly jobDispatcher: IUserLifecycleJobDispatcher,
    private readonly idGenerator: IIdGenerator,
  ) {}

  async execute(command: ResetPrayerLogsCommand): Promise<UserLifecycleJob> {
    const requestedAt = new Date().toISOString();
    const userId = new UserId(command.userId);
    const jobId = new EventId(this.idGenerator.generate());

    const job = await this.jobRepository.createJob({
      userId,
      jobId,
      type: 'reset-prayers',
      requestedAt,
      expiresAt: Math.floor(Date.now() / 1000) + USER_LIFECYCLE_JOB_TTL_SECONDS,
    });

    await this.jobDispatcher.dispatch({
      userId,
      jobId: job.jobId,
    });

    return job;
  }
}
