import { NotFoundError } from '@awdah/shared';
import type {
  IUserLifecycleJobRepository,
  UserLifecycleJob,
} from '../../domain/repositories/user-lifecycle-job.repository';

export interface GetUserLifecycleJobStatusCommand {
  userId: string;
  jobId: string;
}

export class GetUserLifecycleJobStatusUseCase {
  constructor(private readonly jobRepository: IUserLifecycleJobRepository) {}

  async execute(command: GetUserLifecycleJobStatusCommand): Promise<UserLifecycleJob> {
    const job = await this.jobRepository.findById(command.userId, command.jobId);

    if (!job) {
      throw new NotFoundError('Lifecycle job not found');
    }

    return job;
  }
}
