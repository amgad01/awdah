import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { BackupStack } from './backup-stack';
import { ApiStack } from './api-stack';
import { DataStack } from './data-stack';
import { BaseStack, BaseStackProps } from '../shared/base-stack';

export interface AlarmStackProps extends BaseStackProps {
  backupStack: BackupStack;
  apiStack: ApiStack;
  dataStack: DataStack;
  alertEmail?: string;
}

export class AlarmStack extends BaseStack {
  constructor(scope: Construct, id: string, props: AlarmStackProps) {
    super(scope, id, props);

    this.addContextTag('shared');

    const alertTopic = new sns.Topic(this, 'SystemAlerts', {
      topicName: this.fullResourceName('SystemAlerts'),
    });

    if (props.alertEmail) {
      new sns.Subscription(this, 'AlertEmailSubscription', {
        topic: alertTopic,
        protocol: sns.SubscriptionProtocol.EMAIL,
        endpoint: props.alertEmail,
      });
    }

    const addAlarm = (
      id: string,
      metric: cloudwatch.IMetric,
      alarmName: string,
      description: string,
      threshold: number,
      evaluationPeriods = 1,
    ) => {
      const alarm = new cloudwatch.Alarm(this, id, {
        alarmName: this.fullResourceName(alarmName),
        alarmDescription: description,
        metric,
        threshold,
        evaluationPeriods,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      alarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));
    };

    // ── Backup DLQ ────────────────────────────────────────────────────────────
    addAlarm(
      'BackupDLQAlarm',
      props.backupStack.backupDLQ.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      'BackupDLQ',
      'Backup export Lambda failed and sent a message to the DLQ',
      1,
    );

    // ── API Gateway 5xx errors ────────────────────────────────────────────────
    // HTTP API exposes 5XX count under the AWS/ApiGateway2 namespace.
    addAlarm(
      'ApiGateway5xxAlarm',
      new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: { ApiId: props.apiStack.httpApi.apiId },
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      'ApiGateway5xx',
      'API Gateway is returning 5xx responses — Lambda or integration errors may be occurring',
      5,
    );

    // ── Per-Lambda error alarms ───────────────────────────────────────────────
    props.apiStack.lambdaFunctions.forEach((fn, index) => {
      const fnName = fn.functionName;
      addAlarm(
        `LambdaErrors${index}Alarm`,
        fn.metricErrors({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        `Lambda-${fnName}-Errors`,
        `Lambda function ${fnName} is producing errors`,
        3,
        2,
      );

      addAlarm(
        `LambdaThrottles${index}Alarm`,
        fn.metricThrottles({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        `Lambda-${fnName}-Throttles`,
        `Lambda function ${fnName} is being throttled`,
        5,
        2,
      );
    });

    // ── DynamoDB throttling alarms ────────────────────────────────────────────
    const tables = [
      { table: props.dataStack.prayerLogsTable, label: 'PrayerLogs' },
      { table: props.dataStack.fastLogsTable, label: 'FastLogs' },
      { table: props.dataStack.practicingPeriodsTable, label: 'PracticingPeriods' },
      { table: props.dataStack.userSettingsTable, label: 'UserSettings' },
    ];

    tables.forEach(({ table, label }) => {
      addAlarm(
        `DDB${label}ReadThrottleAlarm`,
        table.metricThrottledRequestsForOperations({
          operations: [cdk.aws_dynamodb.Operation.GET_ITEM, cdk.aws_dynamodb.Operation.QUERY],
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        `DDB-${label}-ReadThrottles`,
        `DynamoDB table ${label} read requests are being throttled`,
        5,
        2,
      );

      addAlarm(
        `DDB${label}WriteThrottleAlarm`,
        table.metricThrottledRequestsForOperations({
          operations: [
            cdk.aws_dynamodb.Operation.PUT_ITEM,
            cdk.aws_dynamodb.Operation.UPDATE_ITEM,
            cdk.aws_dynamodb.Operation.DELETE_ITEM,
          ],
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        `DDB-${label}-WriteThrottles`,
        `DynamoDB table ${label} write requests are being throttled`,
        5,
        2,
      );
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', { value: alertTopic.topicArn });
  }
}
