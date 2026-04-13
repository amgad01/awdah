import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda_event_sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';
import { ProjectResourceFactory } from '../shared/resource-factory';
import { CONTEXT, PATH } from '../shared/constants';
import { DataStack } from '../stacks/data-stack';
import { AuthStack } from '../stacks/auth-stack';
import { getConfig } from '../shared/config';
import { getFullResourceName } from '../shared/naming';

export interface UserConstructProps {
  api: apigatewayv2.HttpApi;
  authorizer: apigatewayv2.IHttpRouteAuthorizer;
  dataStack: DataStack;
  authStack: AuthStack;
  projectEnv: string;
}

interface BusinessLambdaOptions {
  entry: string;
  environment?: Record<string, string>;
  memorySize?: number;
  timeout?: cdk.Duration;
  reservedConcurrentExecutions?: number;
}

export class UserConstruct extends Construct {
  public readonly functions = new Map<string, lambda.IFunction>();
  public readonly lifecycleJobDlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: UserConstructProps) {
    super(scope, id);

    const config = getConfig(this);
    const backendSrc = path.join(__dirname, '../../../apps/backend/src');
    const API_VERSION = '/v1';

    const baseEnv = {
      NODE_ENV: props.projectEnv,
      LOG_LEVEL: props.projectEnv === 'prod' ? 'info' : 'debug',
      COGNITO_USER_POOL_ID: props.authStack.userPool.userPoolId,
      PRAYER_LOGS_TABLE: props.dataStack.prayerLogsTable.tableName,
      FAST_LOGS_TABLE: props.dataStack.fastLogsTable.tableName,
      PRACTICING_PERIODS_TABLE: props.dataStack.practicingPeriodsTable.tableName,
      USER_SETTINGS_TABLE: props.dataStack.userSettingsTable.tableName,
      USER_LIFECYCLE_JOBS_TABLE: props.dataStack.userLifecycleJobsTable.tableName,
      DELETED_USERS_TABLE: props.dataStack.deletedUsersTable.tableName,
    };

    const userReadTables = [
      props.dataStack.prayerLogsTable,
      props.dataStack.fastLogsTable,
      props.dataStack.practicingPeriodsTable,
      props.dataStack.userSettingsTable,
    ];

    // 1. GetUserSettings
    const getUserSettingsFn = this.createBusinessLambda('GetUserSettingsFn', {
      entry: path.join(
        backendSrc,
        'contexts/user/infrastructure/handlers/get-user-settings.handler.ts',
      ),
      environment: baseEnv,
    });
    props.dataStack.userSettingsTable.grantReadData(getUserSettingsFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.USER}${PATH.PROFILE}`,
      apigatewayv2.HttpMethod.GET,
      getUserSettingsFn,
      'GetUserSettingsIntegration',
    );

    // 2. UpdateUserSettings
    const updateUserSettingsFn = this.createBusinessLambda('UpdateUserSettingsFn', {
      entry: path.join(
        backendSrc,
        'contexts/user/infrastructure/handlers/update-user-settings.handler.ts',
      ),
      environment: baseEnv,
    });
    props.dataStack.userSettingsTable.grantReadWriteData(updateUserSettingsFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.USER}${PATH.PROFILE}`,
      apigatewayv2.HttpMethod.POST,
      updateUserSettingsFn,
      'UpdateUserSettingsIntegration',
    );

    // 3. DeleteAccount
    const deleteAccountFn = this.createBusinessLambda('DeleteAccountFn', {
      entry: path.join(
        backendSrc,
        'contexts/user/infrastructure/handlers/delete-account.handler.ts',
      ),
      environment: {
        ...baseEnv,
      },
    });
    props.dataStack.userLifecycleJobsTable.grantReadWriteData(deleteAccountFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.USER}${PATH.ACCOUNT}`,
      apigatewayv2.HttpMethod.DELETE,
      deleteAccountFn,
      'DeleteAccountIntegration',
    );

    // 4. ExportData
    const exportDataFn = this.createBusinessLambda('ExportDataFn', {
      entry: path.join(backendSrc, 'contexts/user/infrastructure/handlers/export-data.handler.ts'),
      environment: {
        ...baseEnv,
      },
    });
    props.dataStack.userLifecycleJobsTable.grantReadWriteData(exportDataFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.USER}${PATH.EXPORT}`,
      apigatewayv2.HttpMethod.POST,
      exportDataFn,
      'ExportDataIntegration',
    );

    // 5. GetUserLifecycleJobStatus
    const getUserLifecycleJobStatusFn = this.createBusinessLambda('GetUserLifecycleJobStatusFn', {
      entry: path.join(
        backendSrc,
        'contexts/user/infrastructure/handlers/get-user-lifecycle-job-status.handler.ts',
      ),
      environment: {
        ...baseEnv,
      },
    });
    props.dataStack.userLifecycleJobsTable.grantReadData(getUserLifecycleJobStatusFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.USER}${PATH.STATUS}`,
      apigatewayv2.HttpMethod.GET,
      getUserLifecycleJobStatusFn,
      'GetUserLifecycleJobStatusIntegration',
    );

    // 6. DownloadExportData
    const downloadExportDataFn = this.createBusinessLambda('DownloadExportDataFn', {
      entry: path.join(
        backendSrc,
        'contexts/user/infrastructure/handlers/download-export-data.handler.ts',
      ),
      environment: {
        ...baseEnv,
      },
    });
    props.dataStack.userLifecycleJobsTable.grantReadData(downloadExportDataFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.USER}${PATH.EXPORT}`,
      apigatewayv2.HttpMethod.GET,
      downloadExportDataFn,
      'DownloadExportDataIntegration',
    );

    // 7. FinalizeDeleteAccount
    const finalizeDeleteAccountFn = this.createBusinessLambda('FinalizeDeleteAccountFn', {
      entry: path.join(
        backendSrc,
        'contexts/user/infrastructure/handlers/finalize-delete-account.handler.ts',
      ),
      environment: {
        ...baseEnv,
      },
    });
    props.dataStack.userLifecycleJobsTable.grantReadWriteData(finalizeDeleteAccountFn);
    finalizeDeleteAccountFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminDeleteUser'],
        resources: [
          `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:userpool/${props.authStack.userPool.userPoolId}`,
        ],
      }),
    );
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.USER}${PATH.ACCOUNT_AUTH}`,
      apigatewayv2.HttpMethod.DELETE,
      finalizeDeleteAccountFn,
      'FinalizeDeleteAccountIntegration',
    );

    // 8. ProcessUserLifecycleJob (Event Driven)
    this.lifecycleJobDlq = new sqs.Queue(this, 'LifecycleJobDLQ', {
      queueName: getFullResourceName(this, 'lifecycle-job-dlq', props.projectEnv),
      retentionPeriod: cdk.Duration.days(14),
      enforceSSL: true,
    });

    const processUserLifecycleJobFn = this.createBusinessLambda('ProcessUserLifecycleJobFn', {
      entry: path.join(
        backendSrc,
        'shared/infrastructure/handlers/process-user-lifecycle-job.handler.ts',
      ),
      memorySize: config.heavyOperationMemorySize,
      timeout: config.heavyOperationTimeout,
      reservedConcurrentExecutions: config.adminOperationConcurrency,
      environment: baseEnv,
    });
    props.dataStack.userLifecycleJobsTable.grantReadWriteData(processUserLifecycleJobFn);
    props.dataStack.deletedUsersTable.grantReadWriteData(processUserLifecycleJobFn);
    userReadTables.forEach((table) => table.grantReadData(processUserLifecycleJobFn));

    processUserLifecycleJobFn.addEventSource(
      new lambda_event_sources.DynamoEventSource(props.dataStack.userLifecycleJobsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 5,
        bisectBatchOnError: true,
        retryAttempts: 2,
        onFailure: new lambda_event_sources.SqsDlq(this.lifecycleJobDlq),
      }),
    );
  }

  private createBusinessLambda(id: string, options: BusinessLambdaOptions): lambda.IFunction {
    const fn = ProjectResourceFactory.createNodejsFunction(this, id, {
      entry: options.entry,
      context: CONTEXT.USER,
      environment: options.environment,
      memorySize: options.memorySize,
      timeout: options.timeout,
      reservedConcurrentExecutions: options.reservedConcurrentExecutions,
    });
    this.functions.set(id, fn);
    return fn;
  }

  private addRoute(
    api: apigatewayv2.HttpApi,
    authorizer: apigatewayv2.IHttpRouteAuthorizer,
    path: string,
    method: apigatewayv2.HttpMethod,
    fn: lambda.IFunction,
    integrationId: string,
  ): void {
    api.addRoutes({
      path,
      methods: [method],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration(integrationId, fn),
      authorizer,
    });
  }
}
