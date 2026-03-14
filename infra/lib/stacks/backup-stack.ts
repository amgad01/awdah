import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { DataStack } from './data-stack';

export interface BackupStackProps extends cdk.StackProps {
  environment: string;
  dataStack: DataStack;
  ticket?: string;
}

export class BackupStack extends cdk.Stack {
  public readonly backupDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props: BackupStackProps) {
    super(scope, id, props);

    const resourcePrefix = props.ticket ? `${props.ticket}-` : '';

    const backupBucket = new s3.Bucket(this, 'BackupBucket', {
      bucketName: `${resourcePrefix}awdah-backups-${props.environment}-${this.account}`,
      removalPolicy:
        props.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== 'prod',
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: 'TransitionToGlacier',
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
    });

    this.backupDLQ = new sqs.Queue(this, 'BackupDLQ', {
      queueName: `${resourcePrefix}Awdah-BackupDLQ-${props.environment}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    const tables = [
      props.dataStack.prayerLogsTable,
      props.dataStack.fastLogsTable,
      props.dataStack.practicingPeriodsTable,
      props.dataStack.userSettingsTable,
    ];

    const backupFn = new lambda_nodejs.NodejsFunction(this, 'BackupExportFn', {
      entry: path.join(
        __dirname,
        '../../../apps/backend/src/shared/infrastructure/handlers/backup-export.handler.ts',
      ),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: cdk.Duration.seconds(60),
      deadLetterQueue: this.backupDLQ,
      retryAttempts: 2,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
      environment: {
        TABLE_ARNS: tables.map((t) => t.tableArn).join(','),
        BACKUP_BUCKET: backupBucket.bucketName,
      },
    });

    backupBucket.grantWrite(backupFn);
    tables.forEach((table) => {
      table.grant(backupFn, 'dynamodb:ExportTableToPointInTime', 'dynamodb:DescribeTable');
    });

    // Explicit S3 permissions required by DynamoDB Export
    backupFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:AbortMultipartUpload', 's3:PutObject', 's3:PutObjectAcl'],
        resources: [backupBucket.arnForObjects('*')],
      }),
    );

    new events.Rule(this, 'DailyBackupRule', {
      ruleName: `${resourcePrefix}Awdah-DailyBackup-${props.environment}`,
      schedule: events.Schedule.cron({ hour: '2', minute: '0' }),
      targets: [new targets.LambdaFunction(backupFn)],
    });
  }
}
