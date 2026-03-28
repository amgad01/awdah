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

export class BackupStack extends BaseStack {
  public readonly backupDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props: BackupStackProps) {
    super(scope, id, props);

    this.addContextTag('shared');

    const backupBucket = ProjectResourceFactory.createS3Bucket(
      this,
      'BackupBucket',
      `${this.resourcePrefix}awdah-backups-${this.projectEnv}-${this.account}`,
      this.removalPolicy,
    );

    // Add lifecycle rule manually as factory only handles basic setup
    backupBucket.addLifecycleRule({
      id: 'TransitionToGlacier',
      transitions: [
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(90),
        },
      ],
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
      table.grant(backupFn, 'dynamodb:ExportTableToPointInTime', 'dynamodb:DescribeTable');
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

    // Tombstone cleanup — prunes deleted-user records older than 90 days.
    // Runs at 03:00 UTC, one hour after the daily backup export.
    // The DeletedUsers table is intentionally excluded from the backup set.
    const cleanupFn = ProjectResourceFactory.createNodejsFunction(this, 'TombstoneCleanupFn', {
      entry: path.join(
        __dirname,
        '../../../apps/backend/src/shared/infrastructure/handlers/tombstone-cleanup.handler.ts',
      ),
      timeout: cdk.Duration.seconds(60),
      deadLetterQueue: this.backupDLQ,
      retryAttempts: 2,
      context: 'shared',
      environment: {
        DELETED_USERS_TABLE: props.dataStack.deletedUsersTable.tableName,
        // Suppress mandatory validation of tables this function doesn't use.
        SKIP_ENV_VALIDATION: 'true',
      },
    });

    props.dataStack.deletedUsersTable.grantReadWriteData(cleanupFn);

    new events.Rule(this, 'TombstoneCleanupRule', {
      ruleName: this.fullResourceName('TombstoneCleanup'),
      schedule: events.Schedule.cron({ hour: '3', minute: '0' }),
      targets: [new targets.LambdaFunction(cleanupFn)],
    });
  }
}
