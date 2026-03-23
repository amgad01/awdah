import { createLogger } from '../../middleware/logger';
import type { IUserLifecycleJobDispatcher } from '../../../contexts/user/domain/services/user-lifecycle-job-dispatcher.service.interface';
import type { ProcessUserLifecycleJobUseCase } from '../../../contexts/user/application/use-cases/process-user-lifecycle-job.use-case';

const logger = createLogger('InProcessUserLifecycleJobDispatcher');

export class InProcessUserLifecycleJobDispatcher implements IUserLifecycleJobDispatcher {
  constructor(private readonly processUserLifecycleJobUseCase: ProcessUserLifecycleJobUseCase) {}

  async dispatch(command: { userId: string; jobId: string }): Promise<void> {
    setTimeout(() => {
      void this.processUserLifecycleJobUseCase.execute(command).catch((error) => {
        logger.error({ err: error, ...command }, 'In-process lifecycle job execution failed');
      });
    }, 0);
  }
}

export class NoopUserLifecycleJobDispatcher implements IUserLifecycleJobDispatcher {
  async dispatch(): Promise<void> {}
}
