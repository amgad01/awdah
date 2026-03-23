import { ConflictError, NotFoundError } from '@awdah/shared';
import type {
  IUserLifecycleJobRepository,
  UserLifecycleExportDownload,
} from '../../domain/repositories/user-lifecycle-job.repository';

export interface DownloadExportDataCommand {
  userId: string;
  jobId: string;
}

export class DownloadExportDataUseCase {
  constructor(private readonly jobRepository: IUserLifecycleJobRepository) {}

  async execute(command: DownloadExportDataCommand): Promise<UserLifecycleExportDownload> {
    const job = await this.jobRepository.findById(command.userId, command.jobId);

    if (!job || job.type !== 'export') {
      throw new NotFoundError('Export job not found');
    }

    if (job.status === 'failed') {
      throw new ConflictError(job.errorMessage || 'Export failed');
    }

    if (job.status !== 'completed') {
      throw new ConflictError('Export is still being prepared');
    }

    const download = await this.jobRepository.readExportResult(command.userId, command.jobId);
    if (!download) {
      throw new NotFoundError('Export data is not available');
    }

    return download;
  }
}
