import {
  IUserLifecycleJobRepository,
  USER_LIFECYCLE_JOB_TTL_SECONDS,
  UserLifecycleJobType,
  type UserLifecycleJob,
} from '../../../user/domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../user/domain/services/user-lifecycle-job-dispatcher.service.interface';
import { UserId, EventId, RateLimitError, getRateLimitSince, ERROR_CODES } from '@awdah/shared';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';
import type { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';

export interface ResetPrayerLogsCommand {
  userId: string;
}

export class ResetPrayerLogsUseCase {
  constructor(
    private readonly jobRepository: IUserLifecycleJobRepository,
    private readonly jobDispatcher: IUserLifecycleJobDispatcher,
    private readonly idGenerator: IIdGenerator,
    private readonly prayerLogRepository: IPrayerLogRepository,
  ) {}

  async execute(command: ResetPrayerLogsCommand): Promise<UserLifecycleJob | null> {
    const userId = new UserId(command.userId);

    const hasLogs = await this.prayerLogRepository.hasAnyLogs(userId);
    if (!hasLogs) {
      return null;
    }

    const since = getRateLimitSince();
    const recentJob = await this.jobRepository.findRecentJobByType(
      userId,
      UserLifecycleJobType.ResetPrayers,
      since,
    );

    if (recentJob) {
      throw new RateLimitError(ERROR_CODES.RESET_PRAYERS_RATE_LIMITED);
    }

    const requestedAt = new Date().toISOString();
    const jobId = new EventId(this.idGenerator.generate());

    const job = await this.jobRepository.createJob({
      userId,
      jobId,
      type: UserLifecycleJobType.ResetPrayers,
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
