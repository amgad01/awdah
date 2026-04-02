import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-dynamodb', () => {
  return {
    DynamoDBClient: class {
      send = mockSend;
    },
    ExportTableToPointInTimeCommand: class {
      constructor(public input: unknown) {}
    },
  };
});

vi.mock('../../../middleware/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../../aws/client-config', () => ({
  createAwsClientConfig: () => ({}),
}));

describe('backup-export.handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BACKUP_BUCKET = 'test-backup-bucket';
    process.env.TABLE_ARNS =
      'arn:aws:dynamodb:eu-west-1:123:table/prayer-logs,arn:aws:dynamodb:eu-west-1:123:table/fast-logs';
  });

  it('initiates export for all configured tables', async () => {
    mockSend.mockResolvedValue({
      ExportDescription: {
        ExportArn: 'arn:aws:dynamodb:eu-west-1:123:table/prayer-logs/export/01',
        ExportStatus: 'IN_PROGRESS',
      },
    });

    const mod = await import('../backup-export.handler');
    await mod.handler();

    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('throws when BACKUP_BUCKET is not set', async () => {
    delete process.env.BACKUP_BUCKET;

    const mod = await import('../backup-export.handler');
    await expect(mod.handler()).rejects.toThrow('BACKUP_BUCKET environment variable is not set');
  });

  it('throws when TABLE_ARNS is not set', async () => {
    process.env.TABLE_ARNS = '';

    const mod = await import('../backup-export.handler');
    await expect(mod.handler()).rejects.toThrow('TABLE_ARNS environment variable is not set');
  });

  it('throws when some table exports fail', async () => {
    mockSend
      .mockResolvedValueOnce({
        ExportDescription: { ExportArn: 'arn:export/01', ExportStatus: 'IN_PROGRESS' },
      })
      .mockRejectedValueOnce(new Error('Access denied'));

    const mod = await import('../backup-export.handler');
    await expect(mod.handler()).rejects.toThrow('1 of 2 table exports failed to initiate');
  });
});
