export interface IUserLifecycleJobDispatcher {
  dispatch(command: { userId: string; jobId: string }): Promise<void>;
}
