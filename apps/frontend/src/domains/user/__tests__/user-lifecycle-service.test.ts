import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODES } from '@awdah/shared';
import { deleteUserAccountWorkflow, waitForLifecycleJob } from '../user-lifecycle-service';

const { mockUserRepository } = vi.hoisted(() => ({
  mockUserRepository: {
    startDeleteAccount: vi.fn(),
    finalizeDeleteAccount: vi.fn(),
    getJobStatus: vi.fn(),
    startExportData: vi.fn(),
  },
}));

vi.mock('../user-repository', () => ({
  userRepository: mockUserRepository,
}));

function createJob(
  overrides: Partial<{
    jobId: string;
    type: 'export' | 'delete-account' | 'reset-prayers' | 'reset-fasts';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    requestedAt: string;
    errorMessage: string;
  }> = {},
) {
  return {
    jobId: 'job-1',
    type: 'delete-account' as const,
    status: 'pending' as const,
    requestedAt: '2026-04-14T10:00:00.000Z',
    ...overrides,
  };
}

describe('user-lifecycle-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('waits for delete-account completion and finalizes auth cleanup', async () => {
    mockUserRepository.startDeleteAccount.mockResolvedValue({
      job: createJob(),
    });
    mockUserRepository.getJobStatus.mockResolvedValue({
      job: createJob({ status: 'completed' }),
    });
    mockUserRepository.finalizeDeleteAccount.mockResolvedValue({
      message: 'deleted',
      authDeleted: true,
    });

    const result = await deleteUserAccountWorkflow();

    expect(mockUserRepository.getJobStatus).toHaveBeenCalledWith('job-1');
    expect(mockUserRepository.finalizeDeleteAccount).toHaveBeenCalledWith('job-1');
    expect(result).toEqual({
      message: 'deleted',
      authDeleted: true,
    });
  });

  it('hides backend failure details behind a generic task failure code', async () => {
    mockUserRepository.getJobStatus.mockResolvedValue({
      job: createJob({
        status: 'failed',
        errorMessage: 'AccessDeniedException: missing dynamodb:BatchWriteItem',
      }),
    });

    await expect(waitForLifecycleJob('job-1', 'delete-account')).rejects.toThrow(
      ERROR_CODES.TASK_FAILED,
    );
  });

  it('throws a task-not-found code when no delete job is returned', async () => {
    mockUserRepository.startDeleteAccount.mockResolvedValue(null);

    await expect(deleteUserAccountWorkflow()).rejects.toThrow(ERROR_CODES.TASK_NOT_FOUND);
  });

  it('throws a task-not-found code when the wrong job type is returned', async () => {
    mockUserRepository.getJobStatus.mockResolvedValue({
      job: createJob({ type: 'export' }),
    });

    await expect(waitForLifecycleJob('job-1', 'delete-account')).rejects.toThrow(
      ERROR_CODES.TASK_NOT_FOUND,
    );
  });
});
