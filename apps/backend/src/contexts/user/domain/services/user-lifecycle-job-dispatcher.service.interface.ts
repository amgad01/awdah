import { UserId, EventId } from '@awdah/shared';

export interface IUserLifecycleJobDispatcher {
  dispatch(command: { userId: UserId; jobId: EventId }): Promise<void>;
}
