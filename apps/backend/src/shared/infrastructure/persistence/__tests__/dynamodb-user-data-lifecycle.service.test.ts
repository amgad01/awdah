import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { settings } from '../../../config/settings';
import { PrayerLogKey } from '../keys/prayer-log-key';
import { FastLogKey } from '../keys/fast-log-key';
import { DynamoDBUserDataLifecycleService } from '../dynamodb-user-data-lifecycle.service';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoDBUserDataLifecycleService', () => {
  let service: DynamoDBUserDataLifecycleService;
  const userId = 'user-123';

  beforeEach(() => {
    ddbMock.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new DynamoDBUserDataLifecycleService(ddbMock as any);
  });

  it('exports structured user-owned data with decoded log keys', async () => {
    ddbMock.on(QueryCommand).callsFake((input) => {
      switch (input.TableName) {
        case settings.tables.userSettings:
          return {
            Items: [
              {
                username: 'Amgad',
                dateOfBirth: '1400-01-01',
                bulughDate: '1420-01-01',
                gender: 'male',
                updatedAt: '2025-01-01T00:00:00.000Z',
              },
            ],
          };
        case settings.tables.prayerLogs:
          return {
            Items: [
              {
                sk: PrayerLogKey.encodeSk('1445-09-01', 'FAJR', 'prayer-1'),
                type: 'qadaa',
                loggedAt: '2025-01-02T00:00:00.000Z',
                isVoluntary: false,
              },
            ],
          };
        case settings.tables.fastLogs:
          return {
            Items: [
              {
                sk: FastLogKey.encodeSk('1445-09-02', 'fast-1'),
                type: 'qadaa',
                loggedAt: '2025-01-03T00:00:00.000Z',
                breakReason: 'travel',
              },
            ],
          };
        case settings.tables.practicingPeriods:
          return {
            Items: [
              {
                periodId: 'period-1',
                startDate: '1445-01-01',
                type: 'both',
              },
            ],
          };
        default:
          return { Items: [] };
      }
    });

    const result = await service.exportUserData(userId);

    expect(result).toEqual({
      exportedAt: expect.any(String),
      userId,
      settings: [
        {
          username: 'Amgad',
          dateOfBirth: '1400-01-01',
          bulughDate: '1420-01-01',
          gender: 'male',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      prayerLogs: [
        {
          eventId: 'prayer-1',
          date: '1445-09-01',
          prayerName: 'fajr',
          type: 'qadaa',
          loggedAt: '2025-01-02T00:00:00.000Z',
          isVoluntary: false,
        },
      ],
      fastLogs: [
        {
          eventId: 'fast-1',
          date: '1445-09-02',
          type: 'qadaa',
          loggedAt: '2025-01-03T00:00:00.000Z',
          breakReason: 'travel',
        },
      ],
      practicingPeriods: [
        {
          periodId: 'period-1',
          startDate: '1445-01-01',
          type: 'both',
        },
      ],
    });

    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls).toHaveLength(4);
    expect(calls[1]!.args[0].input).toMatchObject({
      TableName: settings.tables.prayerLogs,
      ProjectionExpression: 'sk, #type, loggedAt, isVoluntary',
    });
    expect(calls[2]!.args[0].input).toMatchObject({
      TableName: settings.tables.fastLogs,
      ProjectionExpression: 'sk, #type, loggedAt, breakReason, isVoluntary',
    });
  });
});
