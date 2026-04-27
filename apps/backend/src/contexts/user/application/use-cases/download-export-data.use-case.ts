import { ConflictError, NotFoundError, UserId, EventId, ERROR_CODES } from '@awdah/shared';
import {
  IUserLifecycleJobRepository,
  UserLifecycleJobStatus,
  isExportJob,
  type UserLifecycleExportDownload,
} from '../../domain/repositories/user-lifecycle-job.repository';

export interface DownloadExportDataCommand {
  userId: string;
  jobId: string;
}

export class DownloadExportDataUseCase {
  constructor(private readonly jobRepository: IUserLifecycleJobRepository) {}

  async execute(command: DownloadExportDataCommand): Promise<UserLifecycleExportDownload> {
    const userId = new UserId(command.userId);
    const jobId = new EventId(command.jobId);

    const job = await this.jobRepository.findById(userId, jobId);

    if (!job || !isExportJob(job)) {
      throw new NotFoundError(ERROR_CODES.TASK_NOT_FOUND);
    }

    if (job.status === UserLifecycleJobStatus.Failed) {
      throw new ConflictError(ERROR_CODES.EXPORT_DOWNLOAD_FAILED);
    }

    if (job.status !== UserLifecycleJobStatus.Completed) {
      throw new ConflictError(ERROR_CODES.EXPORT_RETRY_ERROR);
    }

    const download = await this.jobRepository.readExportResult(userId, jobId);
    if (!download) {
      throw new NotFoundError(ERROR_CODES.EXPORT_DOWNLOAD_FAILED);
    }

    return download;
  }
}
