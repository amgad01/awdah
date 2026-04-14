#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';
import { AlarmStack } from '../lib/stacks/alarm-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { BackupStack } from '../lib/stacks/backup-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';
import { getFullResourceName } from '../lib/shared/naming';
import {
  loadDeploymentConfig,
  validateDeploymentConfig,
  applyGlobalTags,
} from '../lib/shared/config';

const app = new cdk.App();
const config = loadDeploymentConfig(app);

validateDeploymentConfig(config);
applyGlobalTags(app, config);

const stackId = (name: string) => getFullResourceName(app, name, config.environment);

const dataStack = new DataStack(app, stackId('data-stack'), {
  description: 'Awdah Data Stack: DynamoDB tables for prayer logs, fast logs, etc.',
  projectEnv: config.environment,
});

const authStack = new AuthStack(app, stackId('auth-stack'), {
  description: 'Awdah Auth Stack: Cognito identity and auth services.',
  projectEnv: config.environment,
});

const apiStack = new ApiStack(app, stackId('api-stack'), {
  description: 'Awdah API Stack: Serverless compute and API gateway.',
  projectEnv: config.environment,
  dataStack,
  authStack,
  frontendOrigin: config.frontend.origin,
});

const backupStack = new BackupStack(app, stackId('backup-stack'), {
  description: 'Awdah Backup Stack: Daily DynamoDB exports to S3.',
  projectEnv: config.environment,
  dataStack,
});

const alarmStack = new AlarmStack(app, stackId('alarm-stack'), {
  description: 'Awdah Alarm Stack: Observability and health monitoring.',
  projectEnv: config.environment,
  backupStack,
  apiStack,
  dataStack,
  alertEmail: config.alertEmail,
});
alarmStack.addDependency(apiStack);
alarmStack.addDependency(backupStack);
alarmStack.addDependency(dataStack);

if (config.frontend.deploy) {
  const frontendStack = new FrontendStack(app, stackId('frontend-stack'), {
    projectEnv: config.environment,
    domainName: config.frontend.domainName,
    hostedZoneId: config.frontend.hostedZoneId,
    hostedZoneName: config.frontend.hostedZoneName,
    certificateArn: config.frontend.certificateArn,
  });
  frontendStack.addDependency(apiStack);
}

app.synth();
