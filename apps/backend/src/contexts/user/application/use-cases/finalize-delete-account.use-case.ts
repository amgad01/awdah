import { ConflictError, NotFoundError, UserId, EventId, ERROR_CODES } from '@awdah/shared';
import {
  IUserLifecycleJobRepository,
  UserLifecycleJobStatus,
  isDeleteAccountJob,
  type UserLifecycleJob,
} from '../../domain/repositories/user-lifecycle-job.repository';
import type { ICognitoAdminService } from '../../domain/services/cognito-admin.service.interface';
import { createLogger } from '../../../../shared/middleware/logger';

const logger = createLogger('FinalizeDeleteAccountUseCase');

export interface FinalizeDeleteAccountCommand {
  userId: string;
  jobId: string;
}

export interface FinalizeDeleteAccountResult {
  authDeleted: boolean;
}

export class FinalizeDeleteAccountUseCase {
  constructor(
    private readonly jobRepository: IUserLifecycleJobRepository,
    private readonly cognitoAdminService: ICognitoAdminService,
  ) {}

  async execute(command: FinalizeDeleteAccountCommand): Promise<FinalizeDeleteAccountResult> {
    const userId = new UserId(command.userId);
    const jobId = new EventId(command.jobId);

    const job = await this.jobRepository.findById(userId, jobId);

    if (!job || !isDeleteAccountJob(job)) {
      throw new NotFoundError(ERROR_CODES.TASK_NOT_FOUND);
    }

    ensureDeleteJobReady(job);

    if (job.authDeleted) {
      return { authDeleted: true };
    }

    try {
      await this.cognitoAdminService.deleteUser(userId);
      await this.jobRepository.markAuthDeleted(userId, jobId, new Date().toISOString());
      return { authDeleted: true };
    } catch (error) {
      if (isAlreadyDeletedCognitoError(error)) {
        await this.jobRepository.markAuthDeleted(userId, jobId, new Date().toISOString());
        return { authDeleted: true };
      }

      logger.error(
        { err: error, jobId: jobId.toString(), userId: userId.toString() },
        'Account data deletion completed but auth cleanup failed',
      );
      return { authDeleted: false };
    }
  }
}

function ensureDeleteJobReady(job: UserLifecycleJob): void {
  if (job.status === UserLifecycleJobStatus.Failed) {
    throw new ConflictError(job.errorMessage || ERROR_CODES.TASK_FAILED);
  }

  if (job.status !== UserLifecycleJobStatus.Completed) {
    throw new ConflictError(ERROR_CODES.TASK_TIMEOUT);
  }
}

function isAlreadyDeletedCognitoError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'UserNotFoundException' || error.name === 'ResourceNotFoundException')
  );
}
