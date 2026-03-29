import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { BaseStack, BaseStackProps } from '../shared/base-stack';
import { ProjectResourceFactory } from '../shared/resource-factory';

export type DataStackProps = BaseStackProps;

export class DataStack extends BaseStack {
  public readonly prayerLogsTable: dynamodb.Table;
  public readonly fastLogsTable: dynamodb.Table;
  public readonly practicingPeriodsTable: dynamodb.Table;
  public readonly userSettingsTable: dynamodb.Table;
  public readonly userLifecycleJobsTable: dynamodb.Table;
  public readonly deletedUsersTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    this.addContextTag('shared');

    // DynamoDB Constants
    const ATTR = {
      USER_ID: 'userId',
      SK: 'sk',
      TYPE_DATE: 'typeDate',
      PERIOD_ID: 'periodId',
      DELETED_AT: 'deletedAt',
      EXPIRES_AT: 'expiresAt',
    };

    const INDEX = {
      TYPE_DATE: 'typeDateIndex',
    };

    // 1. Prayer Logs Table
    this.prayerLogsTable = ProjectResourceFactory.createDynamoDBTable(
      this,
      'PrayerLogsTable',
      this.fullResourceName('PrayerLogs'),
      { name: ATTR.USER_ID, type: dynamodb.AttributeType.STRING },
      { name: ATTR.SK, type: dynamodb.AttributeType.STRING },
      this.removalPolicy,
    );

    this.prayerLogsTable.addGlobalSecondaryIndex({
      indexName: INDEX.TYPE_DATE,
      partitionKey: { name: ATTR.USER_ID, type: dynamodb.AttributeType.STRING },
      sortKey: { name: ATTR.TYPE_DATE, type: dynamodb.AttributeType.STRING },
    });

    // 2. Fast Logs Table
    this.fastLogsTable = ProjectResourceFactory.createDynamoDBTable(
      this,
      'FastLogsTable',
      this.fullResourceName('FastLogs'),
      { name: ATTR.USER_ID, type: dynamodb.AttributeType.STRING },
      { name: ATTR.SK, type: dynamodb.AttributeType.STRING },
      this.removalPolicy,
    );

    this.fastLogsTable.addGlobalSecondaryIndex({
      indexName: INDEX.TYPE_DATE,
      partitionKey: { name: ATTR.USER_ID, type: dynamodb.AttributeType.STRING },
      sortKey: { name: ATTR.TYPE_DATE, type: dynamodb.AttributeType.STRING },
    });

    // 3. Practicing Periods Table
    this.practicingPeriodsTable = ProjectResourceFactory.createDynamoDBTable(
      this,
      'PracticingPeriodsTable',
      this.fullResourceName('PracticingPeriods'),
      { name: ATTR.USER_ID, type: dynamodb.AttributeType.STRING },
      { name: ATTR.PERIOD_ID, type: dynamodb.AttributeType.STRING },
      this.removalPolicy,
    );

    // 4. User Settings Table
    this.userSettingsTable = ProjectResourceFactory.createDynamoDBTable(
      this,
      'UserSettingsTable',
      this.fullResourceName('UserSettings'),
      { name: ATTR.USER_ID, type: dynamodb.AttributeType.STRING },
      { name: ATTR.SK, type: dynamodb.AttributeType.STRING },
      this.removalPolicy,
    );

    // 5. User Lifecycle Jobs Table
    this.userLifecycleJobsTable = ProjectResourceFactory.createDynamoDBTable(
      this,
      'UserLifecycleJobsTable',
      this.fullResourceName('UserLifecycleJobs'),
      { name: ATTR.USER_ID, type: dynamodb.AttributeType.STRING },
      { name: ATTR.SK, type: dynamodb.AttributeType.STRING },
      this.removalPolicy,
      {
        stream: dynamodb.StreamViewType.NEW_IMAGE,
        timeToLiveAttribute: ATTR.EXPIRES_AT,
      },
    );

    // 6. Deleted Users Table — permanent tombstone ledger, no PITR, not in backup set
    this.deletedUsersTable = ProjectResourceFactory.createDynamoDBTable(
      this,
      'DeletedUsersTable',
      this.fullResourceName('DeletedUsers'),
      { name: ATTR.USER_ID, type: dynamodb.AttributeType.STRING },
      { name: ATTR.DELETED_AT, type: dynamodb.AttributeType.STRING },
      this.removalPolicy,
      { timeToLiveAttribute: ATTR.EXPIRES_AT },
    );
  }
}
