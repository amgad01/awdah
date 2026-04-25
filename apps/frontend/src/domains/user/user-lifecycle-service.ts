import type { DeleteAccountResponse, UserLifecycleJobResponse } from '@/lib/api';
import { userRepository } from './user-repository';
import { ERROR_CODES } from '@awdah/shared';

const USER_JOB_POLL_INTERVAL_MS = 1_500;
const USER_JOB_POLL_TIMEOUT_MS = 90_000;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function requireLifecycleJob(
  response: { job: UserLifecycleJobResponse } | null,
  missingJobErrorCode: string,
): UserLifecycleJobResponse {
  const job = response?.job;

  if (!job) {
    throw new Error(missingJobErrorCode);
  }

  return job;
}

function assertExpectedLifecycleJobType(
  job: UserLifecycleJobResponse,
  expectedType: UserLifecycleJobResponse['type'],
): void {
  if (job.type !== expectedType) {
    throw new Error(ERROR_CODES.TASK_NOT_FOUND);
  }
}

function getCompletedLifecycleJob(job: UserLifecycleJobResponse): UserLifecycleJobResponse | null {
  if (job.status === 'completed') {
    return job;
  }

  if (job.status === 'failed') {
    throw new Error(ERROR_CODES.TASK_FAILED);
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
      ERROR_CODES.TASK_NOT_FOUND,
    );
    assertExpectedLifecycleJobType(job, expectedType);

    const completedJob = getCompletedLifecycleJob(job);
    if (completedJob) {
      return completedJob;
    }

    await sleep(USER_JOB_POLL_INTERVAL_MS);
  }

  throw new Error(ERROR_CODES.TASK_TIMEOUT);
}

export async function prepareUserDataExportWorkflow(): Promise<string> {
  const job = requireLifecycleJob(
    await userRepository.startExportData(),
    ERROR_CODES.EXPORT_DOWNLOAD_FAILED,
  );

  await waitForLifecycleJob(job.jobId, 'export');
  return job.jobId;
}

export async function deleteUserAccountWorkflow(): Promise<DeleteAccountResponse | null> {
  const job = requireLifecycleJob(
    await userRepository.startDeleteAccount(),
    ERROR_CODES.TASK_NOT_FOUND,
  );

  await waitForLifecycleJob(job.jobId, 'delete-account');
  return userRepository.finalizeDeleteAccount(job.jobId);
}
