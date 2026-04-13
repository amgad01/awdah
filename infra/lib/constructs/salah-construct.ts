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

export interface SalahConstructProps {
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

export class SalahConstruct extends Construct {
  public readonly functions = new Map<string, lambda.IFunction>();

  constructor(scope: Construct, id: string, props: SalahConstructProps) {
    super(scope, id);

    const config = getConfig(this);
    const backendSrc = path.join(__dirname, '../../../apps/backend/src');
    const API_VERSION = '/v1';

    const baseEnv = {
      NODE_ENV: props.projectEnv,
      LOG_LEVEL: props.projectEnv === 'prod' ? 'info' : 'debug',
      COGNITO_USER_POOL_ID: props.authStack.userPool.userPoolId,
    };

    // --- Lambda Definitions ---

    // 1. LogPrayer
    const logPrayerFn = this.createBusinessLambda('LogPrayerFn', {
      entry: path.join(backendSrc, 'contexts/salah/infrastructure/handlers/log-prayer.handler.ts'),
      environment: {
        ...baseEnv,
        PRAYER_LOGS_TABLE: props.dataStack.prayerLogsTable.tableName,
      },
    });
    props.dataStack.prayerLogsTable.grantReadWriteData(logPrayerFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SALAH}${PATH.LOG}`,
      apigatewayv2.HttpMethod.POST,
      logPrayerFn,
      'LogPrayerIntegration',
    );

    // 2. GetSalahDebt
    const getSalahDebtFn = this.createBusinessLambda('GetSalahDebtFn', {
      entry: path.join(
        backendSrc,
        'contexts/salah/infrastructure/handlers/get-salah-debt.handler.ts',
      ),
      environment: {
        ...baseEnv,
        PRAYER_LOGS_TABLE: props.dataStack.prayerLogsTable.tableName,
        PRACTICING_PERIODS_TABLE: props.dataStack.practicingPeriodsTable.tableName,
        USER_SETTINGS_TABLE: props.dataStack.userSettingsTable.tableName,
      },
    });
    props.dataStack.prayerLogsTable.grantReadData(getSalahDebtFn);
    props.dataStack.practicingPeriodsTable.grantReadData(getSalahDebtFn);
    props.dataStack.userSettingsTable.grantReadData(getSalahDebtFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SALAH}${PATH.DEBT}`,
      apigatewayv2.HttpMethod.GET,
      getSalahDebtFn,
      'GetSalahDebtIntegration',
    );

    // 3. GetPrayerHistory
    const getPrayerHistoryFn = this.createBusinessLambda('GetPrayerHistoryFn', {
      entry: path.join(
        backendSrc,
        'contexts/salah/infrastructure/handlers/get-prayer-history.handler.ts',
      ),
      environment: {
        ...baseEnv,
        PRAYER_LOGS_TABLE: props.dataStack.prayerLogsTable.tableName,
      },
    });
    props.dataStack.prayerLogsTable.grantReadData(getPrayerHistoryFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SALAH}${PATH.HISTORY}`,
      apigatewayv2.HttpMethod.GET,
      getPrayerHistoryFn,
      'GetPrayerHistoryIntegration',
    );

    // 4. GetPrayerHistoryPage
    const getPrayerHistoryPageFn = this.createBusinessLambda('GetPrayerHistoryPageFn', {
      entry: path.join(
        backendSrc,
        'contexts/salah/infrastructure/handlers/get-prayer-history-page.handler.ts',
      ),
      environment: {
        ...baseEnv,
        PRAYER_LOGS_TABLE: props.dataStack.prayerLogsTable.tableName,
      },
    });
    props.dataStack.prayerLogsTable.grantReadData(getPrayerHistoryPageFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SALAH}${PATH.HISTORY_PAGE}`,
      apigatewayv2.HttpMethod.GET,
      getPrayerHistoryPageFn,
      'GetPrayerHistoryPageIntegration',
    );

    // 5. DeletePrayerLog
    const deletePrayerLogFn = this.createBusinessLambda('DeletePrayerLogFn', {
      entry: path.join(
        backendSrc,
        'contexts/salah/infrastructure/handlers/delete-prayer-log.handler.ts',
      ),
      environment: {
        ...baseEnv,
        PRAYER_LOGS_TABLE: props.dataStack.prayerLogsTable.tableName,
      },
    });
    props.dataStack.prayerLogsTable.grantReadWriteData(deletePrayerLogFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SALAH}${PATH.LOG}`,
      apigatewayv2.HttpMethod.DELETE,
      deletePrayerLogFn,
      'DeletePrayerLogIntegration',
    );

    // 6. ResetPrayerLogs (Heavy)
    const resetPrayerLogsFn = this.createBusinessLambda('ResetPrayerLogsFn', {
      entry: path.join(
        backendSrc,
        'contexts/salah/infrastructure/handlers/reset-prayer-logs.handler.ts',
      ),
      memorySize: config.heavyOperationMemorySize,
      timeout: config.heavyOperationTimeout,
      reservedConcurrentExecutions: config.protectedMutationConcurrency,
      environment: {
        ...baseEnv,
        USER_LIFECYCLE_JOBS_TABLE: props.dataStack.userLifecycleJobsTable.tableName,
      },
    });
    props.dataStack.userLifecycleJobsTable.grantReadWriteData(resetPrayerLogsFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SALAH}${PATH.LOGS}`,
      apigatewayv2.HttpMethod.DELETE,
      resetPrayerLogsFn,
      'ResetPrayerLogsIntegration',
    );

    // 7. AddPeriod
    const addPeriodFn = this.createBusinessLambda('AddPeriodFn', {
      entry: path.join(
        backendSrc,
        'contexts/salah/infrastructure/handlers/add-practicing-period.handler.ts',
      ),
      environment: {
        ...baseEnv,
        USER_SETTINGS_TABLE: props.dataStack.userSettingsTable.tableName,
        PRACTICING_PERIODS_TABLE: props.dataStack.practicingPeriodsTable.tableName,
      },
    });
    props.dataStack.userSettingsTable.grantReadData(addPeriodFn);
    props.dataStack.practicingPeriodsTable.grantReadWriteData(addPeriodFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SALAH}${PATH.PERIOD}`,
      apigatewayv2.HttpMethod.POST,
      addPeriodFn,
      'AddPeriodIntegration',
    );

    // 8. UpdatePeriod
    const updatePeriodFn = this.createBusinessLambda('UpdatePeriodFn', {
      entry: path.join(
        backendSrc,
        'contexts/salah/infrastructure/handlers/update-practicing-period.handler.ts',
      ),
      environment: {
        ...baseEnv,
        USER_SETTINGS_TABLE: props.dataStack.userSettingsTable.tableName,
        PRACTICING_PERIODS_TABLE: props.dataStack.practicingPeriodsTable.tableName,
      },
    });
    props.dataStack.userSettingsTable.grantReadData(updatePeriodFn);
    props.dataStack.practicingPeriodsTable.grantReadWriteData(updatePeriodFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SALAH}${PATH.PERIOD}`,
      apigatewayv2.HttpMethod.PUT,
      updatePeriodFn,
      'UpdatePeriodIntegration',
    );

    // 9. GetPeriods
    const getPeriodsFn = this.createBusinessLambda('GetPeriodsFn', {
      entry: path.join(
        backendSrc,
        'contexts/salah/infrastructure/handlers/get-practicing-periods.handler.ts',
      ),
      environment: {
        ...baseEnv,
        PRACTICING_PERIODS_TABLE: props.dataStack.practicingPeriodsTable.tableName,
      },
    });
    props.dataStack.practicingPeriodsTable.grantReadData(getPeriodsFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SALAH}${PATH.PERIODS}`,
      apigatewayv2.HttpMethod.GET,
      getPeriodsFn,
      'GetPeriodsIntegration',
    );

    // 10. DeletePeriod
    const deletePeriodFn = this.createBusinessLambda('DeletePeriodFn', {
      entry: path.join(
        backendSrc,
        'contexts/salah/infrastructure/handlers/delete-practicing-period.handler.ts',
      ),
      environment: {
        ...baseEnv,
        PRACTICING_PERIODS_TABLE: props.dataStack.practicingPeriodsTable.tableName,
      },
    });
    props.dataStack.practicingPeriodsTable.grantReadWriteData(deletePeriodFn);
    this.addRoute(
      props.api,
      props.authorizer,
      `${API_VERSION}/${CONTEXT.SALAH}${PATH.PERIOD}`,
      apigatewayv2.HttpMethod.DELETE,
      deletePeriodFn,
      'DeletePeriodIntegration',
    );
  }

  private createBusinessLambda(id: string, options: BusinessLambdaOptions): lambda.IFunction {
    const fn = ProjectResourceFactory.createNodejsFunction(this, id, {
      entry: options.entry,
      context: CONTEXT.SALAH,
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
