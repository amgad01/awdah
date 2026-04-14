import { UserId, EventId } from '@awdah/shared';
import {
  IUserLifecycleJobRepository,
  USER_LIFECYCLE_JOB_TTL_SECONDS,
  type UserLifecycleJob,
} from '../../../user/domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../user/domain/services/user-lifecycle-job-dispatcher.service.interface';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';

export interface ResetFastLogsCommand {
  userId: string;
}

export class ResetFastLogsUseCase {
  constructor(
    private readonly jobRepository: IUserLifecycleJobRepository,
    private readonly jobDispatcher: IUserLifecycleJobDispatcher,
    private readonly idGenerator: IIdGenerator,
  ) {}

  async execute(command: ResetFastLogsCommand): Promise<UserLifecycleJob> {
    const userId = new UserId(command.userId);
    const requestedAt = new Date().toISOString();
    const job = await this.jobRepository.createJob({
      userId,
      jobId: new EventId(this.idGenerator.generate()),
      type: 'reset-fasts',
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
