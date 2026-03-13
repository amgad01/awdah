import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  IUserRepository,
  UserSettings,
} from '../../../contexts/shared/domain/repositories/user.repository';
import { HijriDate } from '@awdah/shared';
import { settings } from '../../config/settings';

export class DynamoDBUserRepository implements IUserRepository {
  private readonly tableName = settings.tables.userSettings;

  constructor(private readonly docClient: DynamoDBDocumentClient) {}

  async findById(userId: string): Promise<UserSettings | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        userId,
        sk: 'SETTINGS',
      },
    });

    const response = await this.docClient.send(command);
    if (!response.Item) return null;

    return {
      userId: response.Item.userId,
      bulughDate: HijriDate.fromString(response.Item.bulughDate),
      gender: response.Item.gender,
    };
  }

  async save(userSettings: UserSettings): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        userId: userSettings.userId,
        sk: 'SETTINGS',
        bulughDate: userSettings.bulughDate.toString(),
        gender: userSettings.gender,
        updatedAt: new Date().toISOString(),
      },
    });

    await this.docClient.send(command);
  }
}
