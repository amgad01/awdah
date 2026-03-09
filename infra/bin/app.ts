#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';
import { AlarmStack } from '../lib/stacks/alarm-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { BackupStack } from '../lib/stacks/backup-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('env') || 'dev';

cdk.Tags.of(app).add('project', 'Awdah');
cdk.Tags.of(app).add('env', environment);
cdk.Tags.of(app).add('owner', 'amgad');

const dataStack = new DataStack(app, `Awdah-data-stack-${environment}`, { environment });
const authStack = new AuthStack(app, `Awdah-auth-stack-${environment}`, { environment });

new ApiStack(app, `Awdah-api-stack-${environment}`, {
    environment,
    dataStack,
    authStack,
});

const backupStack = new BackupStack(app, `Awdah-backup-stack-${environment}`, {
    environment,
    dataStack,
});

new AlarmStack(app, `Awdah-alarm-stack-${environment}`, {
    environment,
    backupStack,
});
