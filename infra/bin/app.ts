#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';
import { AlarmStack } from '../lib/stacks/alarm-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { BackupStack } from '../lib/stacks/backup-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('env') || app.node.tryGetContext('appEnv') || 'dev';
const ticket = app.node.tryGetContext('ticket');
const alertEmail = app.node.tryGetContext('alertEmail');
const frontendDomainName = app.node.tryGetContext('frontendDomainName');
const frontendHostedZoneName = app.node.tryGetContext('frontendHostedZoneName');
const frontendHostedZoneId = app.node.tryGetContext('frontendHostedZoneId');
const frontendCertificateArn = app.node.tryGetContext('frontendCertificateArn');
const frontendOrigin = app.node.tryGetContext('frontendOrigin') as string | undefined;
const deployFrontend =
  app.node.tryGetContext('deployFrontend') === true ||
  app.node.tryGetContext('deployFrontend') === 'true';
const commit = app.node.tryGetContext('commit') as string | undefined;
const buildId = app.node.tryGetContext('buildId') as string | undefined;
const envWithTicket = ticket ? `${ticket}-${environment}` : environment;

cdk.Tags.of(app).add('project', 'Awdah');
cdk.Tags.of(app).add('env', environment);
if (ticket) cdk.Tags.of(app).add('ticket', ticket);
cdk.Tags.of(app).add('owner', 'Amgad Mahmoud');
if (commit) cdk.Tags.of(app).add('commit', commit);
if (buildId) cdk.Tags.of(app).add('buildId', buildId);

const dataStack = new DataStack(app, `Awdah-data-stack-${envWithTicket}`, {
  projectEnv: environment,
  ticket,
});
const authStack = new AuthStack(app, `Awdah-auth-stack-${envWithTicket}`, {
  projectEnv: environment,
  ticket,
});

const apiStack = new ApiStack(app, `Awdah-api-stack-${envWithTicket}`, {
  projectEnv: environment,
  dataStack,
  authStack,
  ticket,
  frontendOrigin,
});

const backupStack = new BackupStack(app, `Awdah-backup-stack-${envWithTicket}`, {
  projectEnv: environment,
  dataStack,
  ticket,
});

new AlarmStack(app, `Awdah-alarm-stack-${envWithTicket}`, {
  projectEnv: environment,
  backupStack,
  apiStack,
  dataStack,
  alertEmail,
  ticket,
});

if (deployFrontend) {
  new FrontendStack(app, `Awdah-frontend-stack-${envWithTicket}`, {
    projectEnv: environment,
    apiStack,
    domainName: frontendDomainName,
    hostedZoneId: frontendHostedZoneId,
    hostedZoneName: frontendHostedZoneName,
    certificateArn: frontendCertificateArn,
    ticket,
  });
}

app.synth();
