import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { BackupStack } from './backup-stack';
import { ApiStack } from './api-stack';
import { DataStack } from './data-stack';
import { BaseStack, BaseStackProps } from '../shared/base-stack';
import { getConfig } from '../shared/config';

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
    const config = getConfig(this);

    const alertTopic = new sns.Topic(this, 'SystemAlerts', {
      topicName: this.fullResourceName('SystemAlerts'),
    });
    const createdAlarms: cloudwatch.Alarm[] = [];

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
      createdAlarms.push(alarm);
      return alarm;
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

    // ── Lifecycle Job DLQ ─────────────────────────────────────────────────────
    addAlarm(
      'LifecycleJobDLQAlarm',
      props.apiStack.lifecycleJobDlq.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      'LifecycleJobDLQ',
      'User lifecycle job processing failed after retries — manual investigation required',
      1,
    );

    // ── API Gateway 5xx errors ────────────────────────────────────────────────
    // HTTP API v2 publishes under AWS/ApiGatewayV2 with lowercase metric name.
    addAlarm(
      'ApiGateway5xxAlarm',
      new cloudwatch.Metric({
        namespace: 'AWS/ApiGatewayV2',
        metricName: '5xx',
        dimensionsMap: { ApiId: props.apiStack.httpApi.apiId },
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      'ApiGateway5xx',
      'API Gateway is returning 5xx responses — Lambda or integration errors may be occurring',
      5,
    );

    addAlarm(
      'ApiGatewayLatencyP95Alarm',
      props.apiStack.defaultStage.metricLatency({
        period: cdk.Duration.minutes(5),
        statistic: 'p95',
      }),
      'ApiGateway-Latency-P95',
      'API Gateway p95 latency is elevated and may indicate overload or slow integrations',
      config.apiLatencyAlarmMs,
      2,
    );

    addAlarm(
      'ApiGatewayIntegrationLatencyP95Alarm',
      props.apiStack.defaultStage.metricIntegrationLatency({
        period: cdk.Duration.minutes(5),
        statistic: 'p95',
      }),
      'ApiGateway-IntegrationLatency-P95',
      'API Gateway integration p95 latency is elevated and Lambdas may be slowing down',
      config.apiIntegrationLatencyAlarmMs,
      2,
    );

    // ── Per-Lambda error alarms ───────────────────────────────────────────────
    props.apiStack.lambdaMonitoringConfigs.forEach(
      ({ function: fn, durationAlarmThresholdMs, concurrencyAlarmThreshold }, index) => {
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

        addAlarm(
          `LambdaDurationP95${index}Alarm`,
          fn.metricDuration({
            period: cdk.Duration.minutes(5),
            statistic: 'p95',
          }),
          `Lambda-${fnName}-Duration-P95`,
          `Lambda function ${fnName} p95 duration is elevated`,
          durationAlarmThresholdMs,
          2,
        );

        if (concurrencyAlarmThreshold !== undefined) {
          addAlarm(
            `LambdaConcurrency${index}Alarm`,
            fn.metric('ConcurrentExecutions', {
              period: cdk.Duration.minutes(5),
              statistic: 'Maximum',
            }),
            `Lambda-${fnName}-Concurrency`,
            `Lambda function ${fnName} is saturating its reserved concurrency budget`,
            concurrencyAlarmThreshold,
            2,
          );
        }
      },
    );

    // ── DynamoDB throttling alarms ────────────────────────────────────────────
    const tables = [
      { table: props.dataStack.prayerLogsTable, label: 'PrayerLogs' },
      { table: props.dataStack.fastLogsTable, label: 'FastLogs' },
      { table: props.dataStack.practicingPeriodsTable, label: 'PracticingPeriods' },
      { table: props.dataStack.userSettingsTable, label: 'UserSettings' },
      { table: props.dataStack.userLifecycleJobsTable, label: 'UserLifecycleJobs' },
    ];

    tables.forEach(({ table, label }) => {
      addAlarm(
        `DDB${label}ThrottleAlarm`,
        table.metricThrottledRequests({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        `DDB-${label}-Throttles`,
        `DynamoDB table ${label} requests are being throttled across one or more operations`,
        5,
        2,
      );
    });

    const api5xxMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGatewayV2',
      metricName: '5xx',
      dimensionsMap: { ApiId: props.apiStack.httpApi.apiId },
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    const operationsDashboard = new cloudwatch.Dashboard(this, 'OperationsDashboard', {
      dashboardName: this.fullResourceName('Operations'),
    });

    operationsDashboard.addWidgets(
      new cloudwatch.TextWidget({
        width: 24,
        height: 4,
        markdown: [
          `# ${this.projectEnv.toUpperCase()} Operations Dashboard`,
          '',
          `- API p95 target: < ${config.apiLatencyAlarmMs} ms`,
          `- API integration p95 target: < ${config.apiIntegrationLatencyAlarmMs} ms`,
          `- Default Lambda p95 target: < ${config.defaultLambdaDurationAlarmMs} ms`,
          `- Heavy-operation Lambda p95 target: < ${config.heavyLambdaDurationAlarmMs} ms`,
        ].join('\n'),
      }),
    );

    operationsDashboard.addWidgets(
      new cloudwatch.AlarmStatusWidget({
        title: 'Alarm Status',
        alarms: createdAlarms,
        width: 24,
        height: 6,
      }),
    );

    operationsDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Traffic And Errors',
        width: 12,
        height: 6,
        left: [
          props.apiStack.defaultStage.metricCount({
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
          }),
          props.apiStack.defaultStage.metricClientError({
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
          }),
          api5xxMetric,
        ],
      }),
      new cloudwatch.GraphWidget({
        title: 'API Latency',
        width: 12,
        height: 6,
        left: [
          props.apiStack.defaultStage.metricLatency({
            period: cdk.Duration.minutes(5),
            statistic: 'p50',
            label: 'Latency p50',
          }),
          props.apiStack.defaultStage.metricLatency({
            period: cdk.Duration.minutes(5),
            statistic: 'p95',
            label: 'Latency p95',
          }),
          props.apiStack.defaultStage.metricIntegrationLatency({
            period: cdk.Duration.minutes(5),
            statistic: 'p95',
            label: 'Integration latency p95',
          }),
        ],
      }),
    );

    operationsDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Errors And Throttles',
        width: 12,
        height: 6,
        left: props.apiStack.lambdaMonitoringConfigs.flatMap(({ function: fn }) => [
          fn.metricErrors({
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
            label: `${fn.functionName} errors`,
          }),
          fn.metricThrottles({
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
            label: `${fn.functionName} throttles`,
          }),
        ]),
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration p95',
        width: 12,
        height: 6,
        left: props.apiStack.lambdaMonitoringConfigs.map(({ function: fn }) =>
          fn.metricDuration({
            period: cdk.Duration.minutes(5),
            statistic: 'p95',
            label: fn.functionName,
          }),
        ),
      }),
    );

    operationsDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Throttles',
        width: 24,
        height: 6,
        left: tables.map(({ table, label }) =>
          table.metricThrottledRequestsForOperation(cdk.aws_dynamodb.Operation.GET_ITEM, {
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
            label,
          }),
        ),
      }),
    );

    new cdk.CfnOutput(this, 'AlertTopicArn', { value: alertTopic.topicArn });
    new cdk.CfnOutput(this, 'OperationsDashboardName', {
      value: operationsDashboard.dashboardName,
    });
    new cdk.CfnOutput(this, 'OperationsDashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${operationsDashboard.dashboardName}`,
    });
  }
}
