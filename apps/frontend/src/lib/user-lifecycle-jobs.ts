import type { UserLifecycleJobResponse, UserLifecycleJobType } from '@/lib/api';
import { userRepository } from '@/domains/user/user-repository';

const USER_JOB_POLL_INTERVAL_MS = 1_500;
const USER_JOB_POLL_TIMEOUT_MS = 90_000;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForLifecycleJob(
  jobId: string,
  expectedType: UserLifecycleJobType,
): Promise<UserLifecycleJobResponse> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < USER_JOB_POLL_TIMEOUT_MS) {
    const response = await userRepository.getJobStatus(jobId);
    const job = response?.job;

    if (!job) {
      throw new Error('The background task could not be found.');
    }

    if (job.type !== expectedType) {
      throw new Error('The background task returned an unexpected result.');
    }

    if (job.status === 'completed') {
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(job.errorMessage || 'The background task failed.');
    }

    await sleep(USER_JOB_POLL_INTERVAL_MS);
  }

  throw new Error('common.task_timeout');
}
