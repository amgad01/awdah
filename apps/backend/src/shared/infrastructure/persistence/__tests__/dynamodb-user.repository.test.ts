import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBUserRepository } from '../dynamodb-user.repository';
import { UserSettingsSK } from '../keys/user-settings-key';
import { UserSettings } from '../../../../contexts/shared/domain/repositories/user.repository';
import { HijriDate } from '@awdah/shared';
import { settings } from '../../../config/settings';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoDBUserRepository', () => {
  let repository: DynamoDBUserRepository;
  const userId = 'user-123';
  const tableName = settings.tables.userSettings;

  beforeEach(() => {
    ddbMock.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new DynamoDBUserRepository(ddbMock as any);
  });

  it('should find user by id', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        userId,
        sk: UserSettingsSK.SETTINGS,
        bulughDate: '1420-01-01',
        gender: 'male',
      },
    });

    const user = await repository.findById(userId);

    expect(user).not.toBeNull();
    expect(user!.userId).toBe(userId);
    expect(user!.bulughDate.toString()).toBe('1420-01-01');

    const calls = ddbMock.commandCalls(GetCommand);
    expect(calls[0]!.args[0].input).toEqual({
      TableName: tableName,
      Key: {
        userId,
        sk: UserSettingsSK.SETTINGS,
      },
    });
  });

  it('should save user settings', async () => {
    const user: UserSettings = {
      userId,
      bulughDate: HijriDate.fromString('1420-01-01'),
      gender: 'male',
    };

    ddbMock.on(PutCommand).resolves({});

    await repository.save(user);

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls[0]!.args[0].input).toMatchObject({
      TableName: tableName,
      Item: {
        userId,
        sk: UserSettingsSK.SETTINGS,
        bulughDate: '1420-01-01',
        gender: 'male',
      },
    });
  });
});
