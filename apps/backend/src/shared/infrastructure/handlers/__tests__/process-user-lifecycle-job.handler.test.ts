import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';

const executeMock = vi.fn();
const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
};

vi.mock('../../../di/user-use-cases', () => ({
  getProcessUserLifecycleJobUseCase: () => ({
    execute: executeMock,
  }),
}));

vi.mock('../../../middleware/logger', () => ({
  createLogger: () => logger,
}));

function createRecord({
  eventName = 'INSERT',
  userId = 'user-1',
  jobId = 'job-1',
  status = 'pending',
}: {
  eventName?: DynamoDBRecord['eventName'];
  userId?: string;
  jobId?: string;
  status?: string;
} = {}): DynamoDBRecord {
  return {
    eventName,
    dynamodb: {
      NewImage: {
        userId: { S: userId },
        sk: { S: `JOB#${jobId}` },
        status: { S: status },
      },
    },
  } as DynamoDBRecord;
}

function createEvent(records: DynamoDBRecord[]): DynamoDBStreamEvent {
  return {
    Records: records,
  } as DynamoDBStreamEvent;
}

describe('process-user-lifecycle-job.handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('skips non-eligible records', async () => {
    const { handler } = await import('../process-user-lifecycle-job.handler');

    await handler(
      createEvent([
        createRecord({ eventName: 'MODIFY' }),
        createRecord({ status: 'completed' }),
        {
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              userId: { S: 'user-1' },
              sk: { S: 'JOB#job-1#CHUNK#1' },
              status: { S: 'pending' },
            },
          },
        } as DynamoDBRecord,
      ]),
    );

    expect(executeMock).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      { recordCount: 3 },
      'No eligible lifecycle jobs in batch',
    );
  });

  it('processes eligible pending INSERT records', async () => {
    executeMock.mockResolvedValue(null);
    const { handler } = await import('../process-user-lifecycle-job.handler');

    await handler(
      createEvent([
        createRecord({ userId: 'user-1', jobId: 'job-1' }),
        createRecord({ userId: 'user-2', jobId: 'job-2' }),
      ]),
    );

    expect(executeMock).toHaveBeenCalledTimes(2);
    expect(executeMock.mock.calls[0]?.[0]).toMatchObject({
      userId: { value: 'user-1' },
      jobId: { value: 'job-1' },
    });
    expect(executeMock.mock.calls[1]?.[0]).toMatchObject({
      userId: { value: 'user-2' },
      jobId: { value: 'job-2' },
    });
    expect(logger.info).toHaveBeenCalledWith(
      {
        totalRecords: 2,
        eligibleJobs: 2,
        succeeded: 2,
        failed: 0,
      },
      'Lifecycle job stream batch processed',
    );
  });

  it('throws when any eligible record fails', async () => {
    executeMock.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('boom'));
    const { handler } = await import('../process-user-lifecycle-job.handler');

    await expect(
      handler(
        createEvent([
          createRecord({ userId: 'user-1', jobId: 'job-1' }),
          createRecord({ userId: 'user-2', jobId: 'job-2' }),
        ]),
      ),
    ).rejects.toThrow('1 lifecycle job(s) failed to process');

    expect(logger.error).toHaveBeenCalledWith('Stream record processing failed', {
      index: 1,
      error: 'boom',
    });
  });
});
