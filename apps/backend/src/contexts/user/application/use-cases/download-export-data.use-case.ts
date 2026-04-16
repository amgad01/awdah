import { ConflictError, NotFoundError, UserId, EventId } from '@awdah/shared';
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
      throw new NotFoundError('Export job not found');
    }

    if (job.status === UserLifecycleJobStatus.Failed) {
      throw new ConflictError(job.errorMessage || 'Export failed');
    }

    if (job.status !== UserLifecycleJobStatus.Completed) {
      throw new ConflictError('Export is still being prepared');
    }

    const download = await this.jobRepository.readExportResult(userId, jobId);
    if (!download) {
      throw new NotFoundError('Export data is not available');
    }

    return download;
  }
}
