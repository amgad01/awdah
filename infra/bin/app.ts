#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';
import { AlarmStack } from '../lib/stacks/alarm-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { BackupStack } from '../lib/stacks/backup-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('appEnv') || 'dev';
const ticket = app.node.tryGetContext('ticket');
const envWithTicket = ticket ? `${ticket}-${environment}` : environment;

cdk.Tags.of(app).add('project', 'Awdah');
cdk.Tags.of(app).add('env', environment);
if (ticket) cdk.Tags.of(app).add('ticket', ticket);
cdk.Tags.of(app).add('owner', 'Amgad Mahmoud');

const dataStack = new DataStack(app, `Awdah-data-stack-${envWithTicket}`, {
  projectEnv: environment,
  ticket,
});
const authStack = new AuthStack(app, `Awdah-auth-stack-${envWithTicket}`, {
  projectEnv: environment,
  ticket,
});

new ApiStack(app, `Awdah-api-stack-${envWithTicket}`, {
  projectEnv: environment,
  dataStack,
  authStack,
  ticket,
});

const backupStack = new BackupStack(app, `Awdah-backup-stack-${envWithTicket}`, {
  projectEnv: environment,
  dataStack,
  ticket,
});

new AlarmStack(app, `Awdah-alarm-stack-${envWithTicket}`, {
  projectEnv: environment,
  backupStack,
  ticket,
});

app.synth();
