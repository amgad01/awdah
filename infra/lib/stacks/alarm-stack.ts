import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { BackupStack } from './backup-stack';

export interface AlarmStackProps extends cdk.StackProps {
  environment: string;
  backupStack: BackupStack;
}

export class AlarmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AlarmStackProps) {
    super(scope, id, props);

    const alertTopic = new sns.Topic(this, 'SystemAlerts', {
      topicName: `Awdah-SystemAlerts-${props.environment}`,
    });

    // Example: Alert on 4xx/5xx in the future, for v1 we'll just have a topic.
    // In a real prod env, we'd add subscriptions here.

    new cdk.CfnOutput(this, 'AlertTopicArn', { value: alertTopic.topicArn });
  }
}
