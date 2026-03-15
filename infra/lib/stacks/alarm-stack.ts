import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { BackupStack } from './backup-stack';

export interface AlarmStackProps extends cdk.StackProps {
  environment: string;
  backupStack: BackupStack;
  alertEmail?: string;
  ticket?: string;
}

export class AlarmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AlarmStackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('context', 'shared');

    const resourcePrefix = props.ticket ? `${props.ticket}-` : '';

    const alertTopic = new sns.Topic(this, 'SystemAlerts', {
      topicName: `${resourcePrefix}Awdah-SystemAlerts-${props.environment}`,
    });

    if (props.alertEmail) {
      new sns.Subscription(this, 'AlertEmailSubscription', {
        topic: alertTopic,
        protocol: sns.SubscriptionProtocol.EMAIL,
        endpoint: props.alertEmail,
      });
    }

    const dlqAlarm = new cloudwatch.Alarm(this, 'BackupDLQAlarm', {
      alarmName: `${resourcePrefix}Awdah-BackupDLQ-${props.environment}`,
      alarmDescription: 'Backup export Lambda failed and sent a message to the DLQ',
      metric: props.backupStack.backupDLQ.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    dlqAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    new cdk.CfnOutput(this, 'AlertTopicArn', { value: alertTopic.topicArn });
  }
}
