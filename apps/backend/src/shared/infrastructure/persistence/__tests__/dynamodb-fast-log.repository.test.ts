import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBFastLogRepository } from '../dynamodb-fast-log.repository';
import { FastLog } from '../../../../contexts/sawm/domain/entities/fast-log.entity';
import { HijriDate, UserId, EventId } from '@awdah/shared';
import { LogType } from '../../../../contexts/shared/domain/value-objects/log-type';
import { FastLogKey } from '../keys/fast-log-key';
import { settings } from '../../../config/settings';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoDBFastLogRepository', () => {
  let repository: DynamoDBFastLogRepository;
  const rawUserId = 'user-123';
  const userId = new UserId(rawUserId);
  const dateStr = '1445-09-01';
  const rawEventId = 'event-456';
  const eventId = new EventId(rawEventId);
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
        userId: rawUserId,
        sk: FastLogKey.encodeSk(dateStr, rawEventId),
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
          userId: rawUserId,
          sk: FastLogKey.encodeSk(dateStr, rawEventId),
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
    expect(logs[0]!.userId.toString()).toBe(rawUserId);

    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls[0]!.args[0].input.KeyConditionExpression).toContain('BETWEEN :start AND :end');
  });

  it('should count unique qadaa dates using the GSI query results', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          userId: rawUserId,
          sk: FastLogKey.encodeSk('1445-09-01', 'event-1'),
          type: 'qadaa',
          loggedAt: '2024-03-14T12:00:00.000Z',
          typeDate: FastLogKey.encodeTypeDate('qadaa', '1445-09-01'),
        },
        {
          userId: rawUserId,
          sk: FastLogKey.encodeSk('1445-09-01', 'event-2'),
          type: 'qadaa',
          loggedAt: '2024-03-14T12:05:00.000Z',
          typeDate: FastLogKey.encodeTypeDate('qadaa', '1445-09-01'),
        },
        {
          userId: rawUserId,
          sk: FastLogKey.encodeSk('1445-09-02', 'event-3'),
          type: 'qadaa',
          loggedAt: '2024-03-15T12:00:00.000Z',
          typeDate: FastLogKey.encodeTypeDate('qadaa', '1445-09-02'),
        },
      ],
    });

    const count = await repository.countQadaaCompleted(userId);

    expect(count).toBe(2);
    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls[0]!.args[0].input).toMatchObject({
      IndexName: 'typeDateIndex',
      KeyConditionExpression: 'userId = :pk AND begins_with(typeDate, :prefix)',
    });
  });

  it('should fetch paged fast history in descending order with an encoded cursor', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          userId: rawUserId,
          sk: FastLogKey.encodeSk(dateStr, rawEventId),
          type: 'qadaa',
          loggedAt: '2024-03-14T12:00:00.000Z',
        },
      ],
      LastEvaluatedKey: {
        userId: rawUserId,
        sk: FastLogKey.encodeSk(dateStr, rawEventId),
      },
    });

    const result = await repository.findPageByUserAndDateRange(
      userId,
      HijriDate.fromString(dateStr),
      HijriDate.fromString(dateStr),
      { limit: 25 },
    );

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeDefined();

    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls.at(-1)!.args[0].input).toMatchObject({
      Limit: 25,
      ScanIndexForward: false,
    });
  });
});
