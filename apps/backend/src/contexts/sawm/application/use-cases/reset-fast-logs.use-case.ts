import { UserId, EventId } from '@awdah/shared';
import {
  IUserLifecycleJobRepository,
  USER_LIFECYCLE_JOB_TTL_SECONDS,
  UserLifecycleJobType,
  type UserLifecycleJob,
} from '../../../user/domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../user/domain/services/user-lifecycle-job-dispatcher.service.interface';
import { IIdGenerator } from '../../../../shared/domain/services/id-generator.interface';
import { RateLimitError, ConflictError } from '@awdah/shared';
import type { IFastLogRepository } from '../../domain/repositories/fast-log.repository';

export interface ResetFastLogsCommand {
  userId: string;
}

const RATE_LIMIT_MINUTES = 10;

export class ResetFastLogsUseCase {
  constructor(
    private readonly jobRepository: IUserLifecycleJobRepository,
    private readonly jobDispatcher: IUserLifecycleJobDispatcher,
    private readonly idGenerator: IIdGenerator,
    private readonly fastLogRepository: IFastLogRepository,
  ) {}

  async execute(command: ResetFastLogsCommand): Promise<UserLifecycleJob> {
    const userId = new UserId(command.userId);

    // Check if user has any fast logs to reset
    const hasLogs = await this.fastLogRepository.hasAnyLogs(userId);
    if (!hasLogs) {
      throw new ConflictError('No fast logs to reset');
    }

    // Rate limiting: Check for recent reset-fasts job
    const cooldownMs = RATE_LIMIT_MINUTES * 60 * 1000;
    const since = new Date(Date.now() - cooldownMs).toISOString();
    const recentJob = await this.jobRepository.findRecentJobByType(
      userId,
      UserLifecycleJobType.ResetFasts,
      since,
    );

    if (recentJob) {
      throw new RateLimitError(`Please wait ${RATE_LIMIT_MINUTES} minutes between fast log resets`);
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
