import { UserId, EventId } from '@awdah/shared';
import {
  IUserLifecycleJobRepository,
  USER_LIFECYCLE_JOB_TTL_SECONDS,
  type UserLifecycleJob,
} from '../../domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../domain/services/user-lifecycle-job-dispatcher.service.interface';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';

export interface ExportDataCommand {
  userId: string;
}

export class ExportDataUseCase {
  constructor(
    private readonly jobRepository: IUserLifecycleJobRepository,
    private readonly jobDispatcher: IUserLifecycleJobDispatcher,
    private readonly idGenerator: IIdGenerator,
  ) {}

  async execute(command: ExportDataCommand): Promise<UserLifecycleJob> {
    const userId = new UserId(command.userId);
    const requestedAt = new Date().toISOString();
    const job = await this.jobRepository.createJob({
      userId,
      jobId: new EventId(this.idGenerator.generate()),
      type: 'export',
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
