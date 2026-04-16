import {
  IUserLifecycleJobRepository,
  USER_LIFECYCLE_JOB_TTL_SECONDS,
  UserLifecycleJobType,
  type UserLifecycleJob,
} from '../../../user/domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../user/domain/services/user-lifecycle-job-dispatcher.service.interface';
import { UserId, EventId } from '@awdah/shared';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';
import { RateLimitError, ConflictError } from '@awdah/shared';
import type { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';

export interface ResetPrayerLogsCommand {
  userId: string;
}

const RATE_LIMIT_MINUTES = 10;

export class ResetPrayerLogsUseCase {
  constructor(
    private readonly jobRepository: IUserLifecycleJobRepository,
    private readonly jobDispatcher: IUserLifecycleJobDispatcher,
    private readonly idGenerator: IIdGenerator,
    private readonly prayerLogRepository: IPrayerLogRepository,
  ) {}

  async execute(command: ResetPrayerLogsCommand): Promise<UserLifecycleJob> {
    const userId = new UserId(command.userId);

    // Check if user has any prayer logs to reset
    const hasLogs = await this.prayerLogRepository.hasAnyLogs(userId);
    if (!hasLogs) {
      throw new ConflictError('No prayer logs to reset');
    }

    // Rate limiting: Check for recent reset-prayers job
    const cooldownMs = RATE_LIMIT_MINUTES * 60 * 1000;
    const since = new Date(Date.now() - cooldownMs).toISOString();
    const recentJob = await this.jobRepository.findRecentJobByType(
      userId,
      UserLifecycleJobType.ResetPrayers,
      since,
    );

    if (recentJob) {
      throw new RateLimitError(
        `Please wait ${RATE_LIMIT_MINUTES} minutes between prayer log resets`,
      );
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
