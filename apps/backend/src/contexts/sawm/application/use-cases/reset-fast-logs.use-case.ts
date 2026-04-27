import { UserId, EventId, RateLimitError, getRateLimitSince, ERROR_CODES } from '@awdah/shared';
import {
  IUserLifecycleJobRepository,
  USER_LIFECYCLE_JOB_TTL_SECONDS,
  UserLifecycleJobType,
  type UserLifecycleJob,
} from '../../../user/domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../user/domain/services/user-lifecycle-job-dispatcher.service.interface';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';
import type { IFastLogRepository } from '../../domain/repositories/fast-log.repository';

export interface ResetFastLogsCommand {
  userId: string;
}

export class ResetFastLogsUseCase {
  constructor(
    private readonly jobRepository: IUserLifecycleJobRepository,
    private readonly jobDispatcher: IUserLifecycleJobDispatcher,
    private readonly idGenerator: IIdGenerator,
    private readonly fastLogRepository: IFastLogRepository,
  ) {}

  async execute(command: ResetFastLogsCommand): Promise<UserLifecycleJob | null> {
    const userId = new UserId(command.userId);

    const hasLogs = await this.fastLogRepository.hasAnyLogs(userId);
    if (!hasLogs) {
      return null;
    }

    const since = getRateLimitSince();
    const recentJob = await this.jobRepository.findRecentJobByType(
      userId,
      UserLifecycleJobType.ResetFasts,
      since,
    );

    if (recentJob) {
      throw new RateLimitError(ERROR_CODES.RESET_FASTS_RATE_LIMITED);
    }

    const requestedAt = new Date().toISOString();
    const job = await this.jobRepository.createJob({
      userId,
      jobId: new EventId(this.idGenerator.generate()),
      type: UserLifecycleJobType.ResetFasts,
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
