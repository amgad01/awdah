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

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    this.addContextTag('shared');

    // 1. Prayer Logs Table
    this.prayerLogsTable = ProjectResourceFactory.createDynamoDBTable(
      this,
      'PrayerLogsTable',
      this.fullResourceName('PrayerLogs'),
      { name: 'userId', type: dynamodb.AttributeType.STRING },
      { name: 'sk', type: dynamodb.AttributeType.STRING },
      this.removalPolicy,
    );

    this.prayerLogsTable.addGlobalSecondaryIndex({
      indexName: 'typeDateIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'typeDate', type: dynamodb.AttributeType.STRING },
    });

    // 2. Fast Logs Table
    this.fastLogsTable = ProjectResourceFactory.createDynamoDBTable(
      this,
      'FastLogsTable',
      this.fullResourceName('FastLogs'),
      { name: 'userId', type: dynamodb.AttributeType.STRING },
      { name: 'sk', type: dynamodb.AttributeType.STRING },
      this.removalPolicy,
    );

    this.fastLogsTable.addGlobalSecondaryIndex({
      indexName: 'typeDateIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'typeDate', type: dynamodb.AttributeType.STRING },
    });

    // 3. Practicing Periods Table
    this.practicingPeriodsTable = ProjectResourceFactory.createDynamoDBTable(
      this,
      'PracticingPeriodsTable',
      this.fullResourceName('PracticingPeriods'),
      { name: 'userId', type: dynamodb.AttributeType.STRING },
      { name: 'periodId', type: dynamodb.AttributeType.STRING },
      this.removalPolicy,
    );

    // 4. User Settings Table
    this.userSettingsTable = ProjectResourceFactory.createDynamoDBTable(
      this,
      'UserSettingsTable',
      this.fullResourceName('UserSettings'),
      { name: 'userId', type: dynamodb.AttributeType.STRING },
      { name: 'sk', type: dynamodb.AttributeType.STRING },
      this.removalPolicy,
    );
  }
}
