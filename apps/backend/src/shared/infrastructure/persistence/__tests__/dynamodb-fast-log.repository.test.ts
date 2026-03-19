import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBFastLogRepository } from '../dynamodb-fast-log.repository';
import { FastLog } from '../../../../contexts/sawm/domain/entities/fast-log.entity';
import { HijriDate } from '@awdah/shared';
import { LogType } from '../../../../contexts/shared/domain/value-objects/log-type';
import { FastLogKey } from '../keys/fast-log-key';
import { settings } from '../../../config/settings';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoDBFastLogRepository', () => {
  let repository: DynamoDBFastLogRepository;
  const userId = 'user-123';
  const dateStr = '1445-09-01';
  const eventId = 'event-456';
  const tableName = settings.tables.fastLogs;

  beforeEach(() => {
    ddbMock.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new DynamoDBFastLogRepository(ddbMock as any);
  });

  it('should save a fast log correctly', async () => {
    const log = new FastLog({
      userId,
      date: HijriDate.fromString(dateStr),
      eventId,
      type: new LogType('qadaa'),
      loggedAt: new Date('2024-03-14T12:00:00Z'),
    });

    ddbMock.on(PutCommand).resolves({});

    await repository.save(log);

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args[0].input).toMatchObject({
      TableName: tableName,
      Item: {
        userId,
        sk: FastLogKey.encodeSk(dateStr, eventId),
        type: 'qadaa',
        loggedAt: '2024-03-14T12:00:00.000Z',
        typeDate: FastLogKey.encodeTypeDate('qadaa', dateStr),
      },
    });
  });

  it('should find fast logs by date range', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          userId,
          sk: FastLogKey.encodeSk(dateStr, eventId),
          type: 'qadaa',
          loggedAt: '2024-03-14T12:00:00.000Z',
        },
      ],
    });

    const logs = await repository.findByUserAndDateRange(
      userId,
      HijriDate.fromString(dateStr),
      HijriDate.fromString(dateStr),
    );

    expect(logs).toHaveLength(1);
    expect(logs[0]!.date.toString()).toBe(dateStr);

    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls[0]!.args[0].input.KeyConditionExpression).toContain('BETWEEN :start AND :end');
  });

  it('should count qadaa logs using GSI', async () => {
    ddbMock.on(QueryCommand).resolves({
      Count: 10,
    });

    const count = await repository.countQadaaCompleted(userId);

    expect(count).toBe(10);
    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls[0]!.args[0].input).toMatchObject({
      IndexName: 'GSI1',
      Select: 'COUNT',
      KeyConditionExpression: 'userId = :pk AND begins_with(typeDate, :type)',
    });
  });
});
