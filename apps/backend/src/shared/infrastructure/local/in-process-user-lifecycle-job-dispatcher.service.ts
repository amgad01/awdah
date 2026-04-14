import { UserId, EventId } from '@awdah/shared';
import { createLogger } from '../../middleware/logger';
import type { IUserLifecycleJobDispatcher } from '../../../contexts/user/domain/services/user-lifecycle-job-dispatcher.service.interface';
import type { ProcessUserLifecycleJobUseCase } from '../../../contexts/user/application/use-cases/process-user-lifecycle-job.use-case';

const logger = createLogger('InProcessUserLifecycleJobDispatcher');

export class InProcessUserLifecycleJobDispatcher implements IUserLifecycleJobDispatcher {
  constructor(private readonly processUserLifecycleJobUseCase: ProcessUserLifecycleJobUseCase) {}

  async dispatch(command: { userId: UserId; jobId: EventId }): Promise<void> {
    setTimeout(() => {
      void this.executeInProcess(command);
    }, 0);
  }

  private async executeInProcess(command: { userId: UserId; jobId: EventId }): Promise<void> {
    try {
      await this.processUserLifecycleJobUseCase.execute(command);
    } catch (error) {
      logger.error(
        { err: error, userId: command.userId.toString(), jobId: command.jobId.toString() },
        'In-process lifecycle job execution failed',
      );
    }
  }
}

export class NoopUserLifecycleJobDispatcher implements IUserLifecycleJobDispatcher {
  async dispatch(): Promise<void> {}
}
