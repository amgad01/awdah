import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBPracticingPeriodRepository } from '../dynamodb-practicing-period.repository';
import { PracticingPeriod } from '../../../../contexts/shared/domain/entities/practicing-period.entity';
import { HijriDate, UserId, PeriodId } from '@awdah/shared';
import { settings } from '../../../config/settings';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoDBPracticingPeriodRepository', () => {
  let repository: DynamoDBPracticingPeriodRepository;
  const rawUserId = 'user-123';
  const userId = new UserId(rawUserId);
  const rawPeriodId = 'period-456';
  const periodId = new PeriodId(rawPeriodId);
  const tableName = settings.tables.practicingPeriods;

  beforeEach(() => {
    ddbMock.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new DynamoDBPracticingPeriodRepository(ddbMock as any);
  });

  it('should save a practicing period correctly', async () => {
    const period = new PracticingPeriod({
      userId,
      periodId,
      startDate: HijriDate.fromString('1440-01-01'),
      endDate: HijriDate.fromString('1441-01-01'),
      type: 'both',
    });

    ddbMock.on(PutCommand).resolves({});

    await repository.save(period);

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls[0]?.args[0].input).toMatchObject({
      TableName: tableName,
      Item: {
        userId: rawUserId,
        periodId: rawPeriodId,
        startDate: '1440-01-01',
        endDate: '1441-01-01',
        type: 'both',
      },
    });
  });

  it('should find periods by user', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          userId: rawUserId,
          periodId: rawPeriodId,
          startDate: '1440-01-01',
          endDate: '1441-01-01',
          type: 'both',
        },
      ],
    });

    const periods = await repository.findByUser(userId);

    expect(periods).toHaveLength(1);
    expect(periods[0]?.periodId.toString()).toBe(rawPeriodId);

    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls[0]?.args[0].input.KeyConditionExpression).toBe('userId = :pk');
  });

  it('should delete a period', async () => {
    ddbMock.on(DeleteCommand).resolves({});

    await repository.delete(userId, periodId);

    const calls = ddbMock.commandCalls(DeleteCommand);
    expect(calls[0]!.args[0].input).toEqual({
      TableName: tableName,
      Key: {
        userId: rawUserId,
        periodId: rawPeriodId,
      },
    });
  });

  it('should return a period when findById finds a match', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        userId: rawUserId,
        periodId: rawPeriodId,
        startDate: '1440-01-01',
        endDate: '1441-01-01',
        type: 'both',
      },
    });

    const result = await repository.findById(userId, periodId);

    expect(result).not.toBeNull();
    expect(result?.periodId.toString()).toBe(rawPeriodId);
    const calls = ddbMock.commandCalls(GetCommand);
    expect(calls[0]?.args[0].input).toEqual({
      TableName: tableName,
      Key: { userId: rawUserId, periodId: rawPeriodId },
    });
  });

  it('should return null when findById finds no match', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await repository.findById(userId, new PeriodId('nonexistent'));

    expect(result).toBeNull();
  });
});
