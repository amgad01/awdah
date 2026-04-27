import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBPrayerLogRepository } from '../dynamodb-prayer-log.repository';
import { PrayerLog } from '../../../../contexts/salah/domain/entities/prayer-log.entity';
import { HijriDate, UserId, EventId } from '@awdah/shared';
import { PrayerName } from '../../../../contexts/salah/domain/value-objects/prayer-name';
import { LogType } from '../../../../contexts/shared/domain/value-objects/log-type';
import { PrayerLogKey } from '../keys/prayer-log-key';
import { settings } from '../../../config/settings';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoDBPrayerLogRepository', () => {
  let repository: DynamoDBPrayerLogRepository;
  const rawUserId = 'user-123';
  const userId = new UserId(rawUserId);
  const dateStr = '1445-01-01';
  const rawEventId = 'event-456';
  const eventId = new EventId(rawEventId);
  const tableName = settings.tables.prayerLogs;

  beforeEach(() => {
    ddbMock.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new DynamoDBPrayerLogRepository(ddbMock as any);
  });

  it('should save a prayer log correctly', async () => {
    const log = new PrayerLog({
      userId,
      date: HijriDate.fromString(dateStr),
      prayerName: new PrayerName('fajr'),
      eventId,
      type: new LogType('obligatory'),
      action: 'prayed',
      loggedAt: new Date('2024-01-01T12:00:00Z'),
    });

    ddbMock.on(PutCommand).resolves({});

    await repository.save(log);

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args[0].input).toMatchObject({
      TableName: tableName,
      Item: {
        userId: rawUserId,
        sk: PrayerLogKey.encodeSk(dateStr, 'fajr', rawEventId),
        type: 'obligatory',
        loggedAt: '2024-01-01T12:00:00.000Z',
        typeDate: PrayerLogKey.encodeTypeDate('obligatory', dateStr),
      },
    });
  });

  it('should find prayer logs by date', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          userId: rawUserId,
          sk: PrayerLogKey.encodeSk(dateStr, 'FAJR', rawEventId),
          type: 'obligatory',
          loggedAt: '2024-01-01T12:00:00.000Z',
        },
      ],
    });

    const logs = await repository.findByUserAndDate(userId, HijriDate.fromString(dateStr));

    expect(logs).toHaveLength(1);
    expect(logs[0]!.prayerName.getValue()).toBe('fajr');
    expect(logs[0]!.date.toString()).toBe(dateStr);

    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls[0]!.args[0].input.KeyConditionExpression).toContain('begins_with(sk, :sk)');
  });

  it('should count qadaa logs using GSI', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: Array(5)
        .fill(null)
        .map((_, i) => ({
          userId: rawUserId,
          sk: PrayerLogKey.encodeSk(`1445-01-0${i + 1}`, 'fajr', `event-${i}`),
          type: 'qadaa',
          action: 'prayed',
          loggedAt: new Date().toISOString(),
        })),
    });

    const count = await repository.countQadaaCompleted(userId);

    expect(count).toBe(5);
    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls[0]!.args[0].input).toMatchObject({
      IndexName: 'typeDateIndex',
      KeyConditionExpression: 'userId = :pk AND begins_with(typeDate, :prefix)',
    });
    expect(calls[0]!.args[0].input.ExpressionAttributeValues).toMatchObject({
      ':prefix': PrayerLogKey.typeDatePrefixForType('qadaa'),
    });
  });

  it('should count repeated qadaa logs on the same slot individually', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          userId: rawUserId,
          sk: PrayerLogKey.encodeSk(dateStr, 'fajr', 'event-1'),
          type: 'qadaa',
          action: 'prayed',
          loggedAt: '2024-01-01T10:00:00.000Z',
        },
        {
          userId: rawUserId,
          sk: PrayerLogKey.encodeSk(dateStr, 'fajr', 'event-2'),
          type: 'qadaa',
          action: 'prayed',
          loggedAt: '2024-01-01T11:00:00.000Z',
        },
        {
          userId: rawUserId,
          sk: PrayerLogKey.encodeSk(dateStr, 'fajr', 'event-3'),
          type: 'qadaa',
          action: 'deselected',
          loggedAt: '2024-01-01T12:00:00.000Z',
        },
        {
          userId: rawUserId,
          sk: PrayerLogKey.encodeSk(dateStr, 'fajr', 'event-4'),
          type: 'qadaa',
          action: 'prayed',
          loggedAt: '2024-01-01T13:00:00.000Z',
        },
      ],
    });

    const count = await repository.countQadaaCompleted(userId);
    const byPrayer = await repository.countQadaaCompletedByPrayer(userId);

    expect(count).toBe(2);
    expect(byPrayer).toEqual({ fajr: 2 });
  });

  it('should delete a prayer log entry', async () => {
    ddbMock.on(DeleteCommand).resolves({});

    await repository.deleteEntry(userId, HijriDate.fromString(dateStr), 'fajr', eventId);

    const calls = ddbMock.commandCalls(DeleteCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args[0].input).toMatchObject({
      TableName: tableName,
      Key: {
        userId: rawUserId,
        sk: PrayerLogKey.encodeSk(dateStr, 'fajr', rawEventId),
      },
    });
  });

  it('should fail to create log if it already exists', async () => {
    const log = new PrayerLog({
      userId,
      date: HijriDate.fromString(dateStr),
      prayerName: new PrayerName('fajr'),
      eventId,
      type: new LogType('obligatory'),
      action: 'prayed',
      loggedAt: new Date('2024-01-01T12:00:00Z'),
    });

    ddbMock.on(PutCommand).resolves({});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (repository as any).createOnly(log);

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls[0]!.args[0].input).toMatchObject({
      ConditionExpression: 'attribute_not_exists(userId)',
    });
  });

  it('should update log partially', async () => {
    const keys = { pk: rawUserId, sk: PrayerLogKey.encodeSk(dateStr, 'fajr', rawEventId) };
    const updates = { type: 'qadaa' };

    ddbMock.on(UpdateCommand).resolves({});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (repository as any).updatePartial(keys, updates);

    const calls = ddbMock.commandCalls(UpdateCommand);
    expect(calls[0]!.args[0].input).toMatchObject({
      TableName: tableName,
      Key: {
        userId: rawUserId,
        sk: keys.sk,
      },
      UpdateExpression: 'SET #attr0 = :val0',
      ExpressionAttributeNames: { '#attr0': 'type' },
      ExpressionAttributeValues: { ':val0': 'qadaa' },
    });
  });

  it('should fetch paged prayer history in descending order with an encoded cursor', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          userId: rawUserId,
          sk: PrayerLogKey.encodeSk(dateStr, 'FAJR', rawEventId),
          type: 'qadaa',
          loggedAt: '2024-01-01T12:00:00.000Z',
        },
      ],
      LastEvaluatedKey: {
        userId: rawUserId,
        sk: PrayerLogKey.encodeSk(dateStr, 'FAJR', rawEventId),
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
