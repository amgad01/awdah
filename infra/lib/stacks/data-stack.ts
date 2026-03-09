import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface DataStackProps extends cdk.StackProps {
  environment: string;
  ticket?: string;
}

export class DataStack extends cdk.Stack {
  public readonly prayerLogsTable: dynamodb.Table;
  public readonly fastLogsTable: dynamodb.Table;
  public readonly practicingPeriodsTable: dynamodb.Table;
  public readonly userSettingsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const removalPolicy =
      props.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    const resourcePrefix = props.ticket ? `${props.ticket}-` : '';

    // 1. Prayer Logs Table
    this.prayerLogsTable = new dynamodb.Table(this, 'PrayerLogsTable', {
      tableName: `${resourcePrefix}Awdah-PrayerLogs-${props.environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy,
    });

    this.prayerLogsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'typeDate', type: dynamodb.AttributeType.STRING },
    });

    // 2. Fast Logs Table
    this.fastLogsTable = new dynamodb.Table(this, 'FastLogsTable', {
      tableName: `${resourcePrefix}Awdah-FastLogs-${props.environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy,
    });

    this.fastLogsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'typeDate', type: dynamodb.AttributeType.STRING },
    });

    // 3. Practicing Periods Table
    this.practicingPeriodsTable = new dynamodb.Table(this, 'PracticingPeriodsTable', {
      tableName: `${resourcePrefix}Awdah-PracticingPeriods-${props.environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'periodId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy,
    });

    // 4. User Settings Table
    this.userSettingsTable = new dynamodb.Table(this, 'UserSettingsTable', {
      tableName: `${resourcePrefix}Awdah-UserSettings-${props.environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy,
    });
  }
}
