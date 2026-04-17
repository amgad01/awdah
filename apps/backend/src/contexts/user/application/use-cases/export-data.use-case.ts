import {
  UserId,
  EventId,
  RateLimitError,
  RATE_LIMIT_MINUTES,
  getRateLimitSince,
} from '@awdah/shared';
import {
  IUserLifecycleJobRepository,
  USER_LIFECYCLE_JOB_TTL_SECONDS,
  UserLifecycleJobType,
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

    const since = getRateLimitSince();
    const recentJob = await this.jobRepository.findRecentJobByType(
      userId,
      UserLifecycleJobType.Export,
      since,
    );

    if (recentJob) {
      throw new RateLimitError(`Please wait ${RATE_LIMIT_MINUTES} minutes between data exports`);
    }

    const jobId = new EventId(this.idGenerator.generate());

    const job = await this.jobRepository.createJob({
      userId,
      jobId,
      type: UserLifecycleJobType.Export,
      requestedAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + USER_LIFECYCLE_JOB_TTL_SECONDS,
    });

    await this.jobDispatcher.dispatch({
      userId,
      jobId: job.jobId,
    });

    return job;
  }
}
