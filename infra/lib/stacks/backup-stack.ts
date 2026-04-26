import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { DataStack } from './data-stack';
import { BaseStack, BaseStackProps } from '../shared/base-stack';
import { ProjectResourceFactory } from '../shared/resource-factory';

export interface BackupStackProps extends BaseStackProps {
  dataStack: DataStack;
}

const BACKUP_TRANSITION_TO_GLACIER_DAYS = 30;
const BACKUP_EXPIRATION_DAYS = 90;

export class BackupStack extends BaseStack {
  public readonly backupDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props: BackupStackProps) {
    super(scope, id, props);

    this.addContextTag('shared');

    const backupBucket = ProjectResourceFactory.createS3Bucket(
      this,
      'BackupBucket',
      `${this.getTicketPrefix()}awdah-backups-${this.projectEnv}-${this.account}`,
      this.removalPolicy,
    );

    // Add lifecycle rule manually as factory only handles basic setup
    backupBucket.addLifecycleRule({
      id: 'TransitionAndExpireBackups',
      transitions: [
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(BACKUP_TRANSITION_TO_GLACIER_DAYS),
        },
      ],
      expiration: cdk.Duration.days(BACKUP_EXPIRATION_DAYS),
    });

    this.backupDLQ = new sqs.Queue(this, 'BackupDLQ', {
      queueName: this.fullResourceName('BackupDLQ'),
      retentionPeriod: cdk.Duration.days(14),
    });

    const tables = [
      props.dataStack.prayerLogsTable,
      props.dataStack.fastLogsTable,
      props.dataStack.practicingPeriodsTable,
      props.dataStack.userSettingsTable,
      props.dataStack.deletedUsersTable,
    ];

    const backupFn = ProjectResourceFactory.createNodejsFunction(this, 'BackupExportFn', {
      entry: path.join(
        __dirname,
        '../../../apps/backend/src/shared/infrastructure/handlers/backup-export.handler.ts',
      ),
      timeout: cdk.Duration.seconds(60),
      deadLetterQueue: this.backupDLQ,
      retryAttempts: 2,
      context: 'shared',
      environment: {
        TABLE_ARNS: tables.map((t) => t.tableArn).join(','),
        BACKUP_BUCKET: backupBucket.bucketName,
      },
    });

    backupBucket.grantWrite(backupFn);
    tables.forEach((table) => {
      backupFn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['dynamodb:ExportTableToPointInTime', 'dynamodb:DescribeTable'],
          resources: [table.tableArn],
        }),
      );
    });

    backupFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:AbortMultipartUpload', 's3:PutObject', 's3:PutObjectAcl'],
        resources: [backupBucket.arnForObjects('*')],
      }),
    );

    new events.Rule(this, 'DailyBackupRule', {
      ruleName: this.fullResourceName('DailyBackup'),
      schedule: events.Schedule.cron({ hour: '2', minute: '0' }),
      targets: [new targets.LambdaFunction(backupFn)],
    });
  }
}
