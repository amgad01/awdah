import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';
import * as path from 'path';
import { ProjectResourceFactory } from '../shared/resource-factory';
import { CONTEXT, PATH } from '../shared/constants';
import { DataStack } from '../stacks/data-stack';
import { AuthStack } from '../stacks/auth-stack';
import { getConfig } from '../shared/config';

export interface SawmConstructProps {
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

export class SawmConstruct extends Construct {
  public readonly functions = new Map<string, lambda.IFunction>();

  constructor(scope: Construct, id: string, props: SawmConstructProps) {
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

    // --- Lambda Definitions ---

    // 1. LogFast
    const logFastFn = this.createBusinessLambda('LogFastFn', {
      entry: path.join(backendSrc, 'contexts/sawm/infrastructure/handlers/log-fast.handler.ts'),
      environment: baseEnv,
    });
    props.dataStack.fastLogsTable.grantReadWriteData(logFastFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SAWM}${PATH.LOG}`,
      apigatewayv2.HttpMethod.POST,
      logFastFn,
      'LogFastIntegration',
    );

    // 2. GetSawmDebt
    const getSawmDebtFn = this.createBusinessLambda('GetSawmDebtFn', {
      entry: path.join(
        backendSrc,
        'contexts/sawm/infrastructure/handlers/get-sawm-debt.handler.ts',
      ),
      environment: baseEnv,
    });
    props.dataStack.fastLogsTable.grantReadData(getSawmDebtFn);
    props.dataStack.practicingPeriodsTable.grantReadData(getSawmDebtFn);
    props.dataStack.userSettingsTable.grantReadData(getSawmDebtFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SAWM}${PATH.DEBT}`,
      apigatewayv2.HttpMethod.GET,
      getSawmDebtFn,
      'GetSawmDebtIntegration',
    );

    // 3. GetFastHistory
    const getFastHistoryFn = this.createBusinessLambda('GetFastHistoryFn', {
      entry: path.join(
        backendSrc,
        'contexts/sawm/infrastructure/handlers/get-fast-history.handler.ts',
      ),
      environment: baseEnv,
    });
    props.dataStack.fastLogsTable.grantReadData(getFastHistoryFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SAWM}${PATH.HISTORY}`,
      apigatewayv2.HttpMethod.GET,
      getFastHistoryFn,
      'GetFastHistoryIntegration',
    );

    // 4. GetFastHistoryPage
    const getFastHistoryPageFn = this.createBusinessLambda('GetFastHistoryPageFn', {
      entry: path.join(
        backendSrc,
        'contexts/sawm/infrastructure/handlers/get-fast-history-page.handler.ts',
      ),
      environment: baseEnv,
    });
    props.dataStack.fastLogsTable.grantReadData(getFastHistoryPageFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SAWM}${PATH.HISTORY_PAGE}`,
      apigatewayv2.HttpMethod.GET,
      getFastHistoryPageFn,
      'GetFastHistoryPageIntegration',
    );

    // 5. DeleteFastLog
    const deleteFastLogFn = this.createBusinessLambda('DeleteFastLogFn', {
      entry: path.join(
        backendSrc,
        'contexts/sawm/infrastructure/handlers/delete-fast-log.handler.ts',
      ),
      environment: baseEnv,
    });
    props.dataStack.fastLogsTable.grantReadWriteData(deleteFastLogFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SAWM}${PATH.LOG}`,
      apigatewayv2.HttpMethod.DELETE,
      deleteFastLogFn,
      'DeleteFastLogIntegration',
    );

    // 6. ResetFastLogs (Heavy)
    const resetFastLogsFn = this.createBusinessLambda('ResetFastLogsFn', {
      entry: path.join(
        backendSrc,
        'contexts/sawm/infrastructure/handlers/reset-fast-logs.handler.ts',
      ),
      memorySize: config.heavyOperationMemorySize,
      timeout: config.heavyOperationTimeout,
      reservedConcurrentExecutions: config.protectedMutationConcurrency,
      environment: baseEnv,
    });
    props.dataStack.userLifecycleJobsTable.grantReadWriteData(resetFastLogsFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SAWM}${PATH.LOGS}`,
      apigatewayv2.HttpMethod.DELETE,
      resetFastLogsFn,
      'ResetFastLogsIntegration',
    );
  }

  private createBusinessLambda(id: string, options: BusinessLambdaOptions): lambda.IFunction {
    const fn = ProjectResourceFactory.createNodejsFunction(this, id, {
      entry: options.entry,
      context: CONTEXT.SAWM,
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
