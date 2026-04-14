import type { DeleteAccountResponse, UserLifecycleJobResponse } from '@/lib/api';
import { userRepository } from './user-repository';

const USER_JOB_POLL_INTERVAL_MS = 1_500;
const USER_JOB_POLL_TIMEOUT_MS = 90_000;
const LIFECYCLE_JOB_ERROR_KEYS = {
  notFound: 'common.task_not_found',
  unexpectedResult: 'common.task_unexpected_result',
  failed: 'common.task_failed',
  timeout: 'common.task_timeout',
  deleteStartFailed: 'common.account_deletion_failed',
  exportStartFailed: 'common.data_export_failed',
} as const;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function requireLifecycleJob(
  response: { job: UserLifecycleJobResponse } | null,
  missingJobErrorKey: string,
): UserLifecycleJobResponse {
  const job = response?.job;

  if (!job) {
    throw new Error(missingJobErrorKey);
  }

  return job;
}

function assertExpectedLifecycleJobType(
  job: UserLifecycleJobResponse,
  expectedType: UserLifecycleJobResponse['type'],
): void {
  if (job.type !== expectedType) {
    throw new Error(LIFECYCLE_JOB_ERROR_KEYS.unexpectedResult);
  }
}

function getCompletedLifecycleJob(job: UserLifecycleJobResponse): UserLifecycleJobResponse | null {
  if (job.status === 'completed') {
    return job;
  }

  if (job.status === 'failed') {
    throw new Error(LIFECYCLE_JOB_ERROR_KEYS.failed);
  }

  return null;
}

export async function waitForLifecycleJob(
  jobId: string,
  expectedType: UserLifecycleJobResponse['type'],
): Promise<UserLifecycleJobResponse> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < USER_JOB_POLL_TIMEOUT_MS) {
    const job = requireLifecycleJob(
      await userRepository.getJobStatus(jobId),
      LIFECYCLE_JOB_ERROR_KEYS.notFound,
    );
    assertExpectedLifecycleJobType(job, expectedType);

    const completedJob = getCompletedLifecycleJob(job);
    if (completedJob) {
      return completedJob;
    }

    await sleep(USER_JOB_POLL_INTERVAL_MS);
  }

  throw new Error(LIFECYCLE_JOB_ERROR_KEYS.timeout);
}

export async function prepareUserDataExportWorkflow(): Promise<string> {
  const job = requireLifecycleJob(
    await userRepository.startExportData(),
    LIFECYCLE_JOB_ERROR_KEYS.exportStartFailed,
  );

  await waitForLifecycleJob(job.jobId, 'export');
  return job.jobId;
}

export async function deleteUserAccountWorkflow(): Promise<DeleteAccountResponse | null> {
  const job = requireLifecycleJob(
    await userRepository.startDeleteAccount(),
    LIFECYCLE_JOB_ERROR_KEYS.deleteStartFailed,
  );

  await waitForLifecycleJob(job.jobId, 'delete-account');
  return userRepository.finalizeDeleteAccount(job.jobId);
}
