import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { DataStack } from './data-stack';
import { AuthStack } from './auth-stack';
import { BaseStack, BaseStackProps } from '../shared/base-stack';
import { ProjectResourceFactory } from '../shared/resource-factory';
import { getConfig } from '../shared/config';

export interface ApiStackProps extends BaseStackProps {
  dataStack: DataStack;
  authStack: AuthStack;
  frontendOrigin?: string;
}

type TableGrant = cdk.aws_dynamodb.ITable;

interface LambdaDefinition {
  id: string;
  entryPath: string;
  context: string;
  readTables?: TableGrant[];
  writeTables?: TableGrant[];
  memorySize?: number;
  timeout?: cdk.Duration;
  reservedConcurrentExecutions?: number;
  durationAlarmThresholdMs?: number;
  concurrencyAlarmThreshold?: number;
}

interface RouteDefinition {
  path: string;
  method: apigatewayv2.HttpMethod;
  lambdaId: string;
  integrationId: string;
}

export class ApiStack extends BaseStack {
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly defaultStage: apigatewayv2.HttpStage;
  public readonly lambdaFunctions: lambda.IFunction[];
  public readonly lambdaMonitoringConfigs: Array<{
    function: lambda.IFunction;
    durationAlarmThresholdMs: number;
    concurrencyAlarmThreshold?: number;
  }>;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.addContextTag('api');
    const config = getConfig(this);

    const corsAllowedOrigins =
      this.projectEnv === 'prod'
        ? ['https://awdah.app']
        : this.projectEnv === 'staging'
          ? ['https://staging.awdah.app']
          : ['http://localhost:5173', 'http://localhost:8080'];

    const api = new apigatewayv2.HttpApi(this, 'AwdahApi', {
      apiName: this.fullResourceName('API'),
      createDefaultStage: false,
      corsPreflight: {
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: props.frontendOrigin
          ? [...corsAllowedOrigins, props.frontendOrigin]
          : corsAllowedOrigins,
      },
    });
    this.httpApi = api;

    const defaultStage = new apigatewayv2.HttpStage(this, 'DefaultStage', {
      httpApi: api,
      stageName: '$default',
      autoDeploy: true,
      throttle: config.apiThrottle,
    });
    this.defaultStage = defaultStage;

    const authorizer = new HttpUserPoolAuthorizer('AwdahAuthorizer', props.authStack.userPool, {
      userPoolClients: [props.authStack.userPoolClient],
    });

    const API_VERSION = '/v1';
    const backendSrc = path.join(__dirname, '../../../apps/backend/src');

    const sharedEnv = {
      NODE_ENV: this.projectEnv,
      LOG_LEVEL: this.projectEnv === 'prod' ? 'info' : 'debug',
      PRAYER_LOGS_TABLE: props.dataStack.prayerLogsTable.tableName,
      FAST_LOGS_TABLE: props.dataStack.fastLogsTable.tableName,
      PRACTICING_PERIODS_TABLE: props.dataStack.practicingPeriodsTable.tableName,
      USER_SETTINGS_TABLE: props.dataStack.userSettingsTable.tableName,
      COGNITO_USER_POOL_ID: props.authStack.userPool.userPoolId,
    };

    const createLambda = ({
      id,
      entryPath,
      context,
      readTables = [],
      writeTables = [],
      memorySize,
      timeout,
      reservedConcurrentExecutions,
    }: LambdaDefinition) => {
      const fn = ProjectResourceFactory.createNodejsFunction(this, id, {
        entry: path.join(backendSrc, entryPath),
        context,
        environment: sharedEnv,
        memorySize,
        timeout,
        reservedConcurrentExecutions,
      });
      readTables.forEach((table) => table.grantReadData(fn));
      writeTables.forEach((table) => table.grantReadWriteData(fn));
      return fn;
    };

    const userReadTables = [
      props.dataStack.prayerLogsTable,
      props.dataStack.fastLogsTable,
      props.dataStack.practicingPeriodsTable,
      props.dataStack.userSettingsTable,
    ];

    const businessLambdaDefinitions: LambdaDefinition[] = [
      {
        id: 'LogPrayerFn',
        entryPath: 'contexts/salah/infrastructure/handlers/log-prayer.handler.ts',
        context: 'salah',
        writeTables: [props.dataStack.prayerLogsTable],
      },
      {
        id: 'GetSalahDebtFn',
        entryPath: 'contexts/salah/infrastructure/handlers/get-salah-debt.handler.ts',
        context: 'salah',
        readTables: [
          props.dataStack.prayerLogsTable,
          props.dataStack.practicingPeriodsTable,
          props.dataStack.userSettingsTable,
        ],
      },
      {
        id: 'LogFastFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/log-fast.handler.ts',
        context: 'sawm',
        writeTables: [props.dataStack.fastLogsTable],
      },
      {
        id: 'GetSawmDebtFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/get-sawm-debt.handler.ts',
        context: 'sawm',
        readTables: [
          props.dataStack.fastLogsTable,
          props.dataStack.practicingPeriodsTable,
          props.dataStack.userSettingsTable,
        ],
      },
      {
        id: 'AddPeriodFn',
        entryPath: 'contexts/salah/infrastructure/handlers/add-practicing-period.handler.ts',
        context: 'salah',
        readTables: [props.dataStack.userSettingsTable],
        writeTables: [props.dataStack.practicingPeriodsTable],
      },
      {
        id: 'UpdatePeriodFn',
        entryPath: 'contexts/salah/infrastructure/handlers/update-practicing-period.handler.ts',
        context: 'salah',
        readTables: [props.dataStack.userSettingsTable, props.dataStack.practicingPeriodsTable],
        writeTables: [props.dataStack.practicingPeriodsTable],
      },
      {
        id: 'GetPeriodsFn',
        entryPath: 'contexts/salah/infrastructure/handlers/get-practicing-periods.handler.ts',
        context: 'salah',
        readTables: [props.dataStack.practicingPeriodsTable],
      },
      {
        id: 'DeletePeriodFn',
        entryPath: 'contexts/salah/infrastructure/handlers/delete-practicing-period.handler.ts',
        context: 'salah',
        writeTables: [props.dataStack.practicingPeriodsTable],
      },
      {
        id: 'GetUserSettingsFn',
        entryPath: 'contexts/user/infrastructure/handlers/get-user-settings.handler.ts',
        context: 'user',
        readTables: [props.dataStack.userSettingsTable],
      },
      {
        id: 'UpdateUserSettingsFn',
        entryPath: 'contexts/user/infrastructure/handlers/update-user-settings.handler.ts',
        context: 'user',
        writeTables: [props.dataStack.userSettingsTable],
      },
      {
        id: 'GetPrayerHistoryFn',
        entryPath: 'contexts/salah/infrastructure/handlers/get-prayer-history.handler.ts',
        context: 'salah',
        readTables: [props.dataStack.prayerLogsTable],
      },
      {
        id: 'GetPrayerHistoryPageFn',
        entryPath: 'contexts/salah/infrastructure/handlers/get-prayer-history-page.handler.ts',
        context: 'salah',
        readTables: [props.dataStack.prayerLogsTable],
      },
      {
        id: 'GetFastHistoryFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/get-fast-history.handler.ts',
        context: 'sawm',
        readTables: [props.dataStack.fastLogsTable],
      },
      {
        id: 'GetFastHistoryPageFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/get-fast-history-page.handler.ts',
        context: 'sawm',
        readTables: [props.dataStack.fastLogsTable],
      },
      {
        id: 'DeletePrayerLogFn',
        entryPath: 'contexts/salah/infrastructure/handlers/delete-prayer-log.handler.ts',
        context: 'salah',
        writeTables: [props.dataStack.prayerLogsTable],
      },
      {
        id: 'ResetPrayerLogsFn',
        entryPath: 'contexts/salah/infrastructure/handlers/reset-prayer-logs.handler.ts',
        context: 'salah',
        writeTables: [props.dataStack.prayerLogsTable],
        memorySize: config.heavyOperationMemorySize,
        timeout: config.heavyOperationTimeout,
        reservedConcurrentExecutions: config.protectedMutationConcurrency,
        durationAlarmThresholdMs: config.heavyLambdaDurationAlarmMs,
        concurrencyAlarmThreshold: config.protectedMutationConcurrency,
      },
      {
        id: 'DeleteFastLogFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/delete-fast-log.handler.ts',
        context: 'sawm',
        writeTables: [props.dataStack.fastLogsTable],
      },
      {
        id: 'ResetFastLogsFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/reset-fast-logs.handler.ts',
        context: 'sawm',
        writeTables: [props.dataStack.fastLogsTable],
        memorySize: config.heavyOperationMemorySize,
        timeout: config.heavyOperationTimeout,
        reservedConcurrentExecutions: config.protectedMutationConcurrency,
        durationAlarmThresholdMs: config.heavyLambdaDurationAlarmMs,
        concurrencyAlarmThreshold: config.protectedMutationConcurrency,
      },
      {
        id: 'DeleteAccountFn',
        entryPath: 'contexts/user/infrastructure/handlers/delete-account.handler.ts',
        context: 'user',
        writeTables: userReadTables,
        memorySize: config.heavyOperationMemorySize,
        timeout: config.heavyOperationTimeout,
        reservedConcurrentExecutions: config.adminOperationConcurrency,
        durationAlarmThresholdMs: config.heavyLambdaDurationAlarmMs,
        concurrencyAlarmThreshold: config.adminOperationConcurrency,
      },
      {
        id: 'ExportDataFn',
        entryPath: 'contexts/user/infrastructure/handlers/export-data.handler.ts',
        context: 'user',
        readTables: userReadTables,
        memorySize: config.heavyOperationMemorySize,
        timeout: config.heavyOperationTimeout,
        reservedConcurrentExecutions: config.adminOperationConcurrency,
        durationAlarmThresholdMs: config.heavyLambdaDurationAlarmMs,
        concurrencyAlarmThreshold: config.adminOperationConcurrency,
      },
    ];

    const businessLambdas = new Map<string, lambda.IFunction>();
    businessLambdaDefinitions.forEach((definition) => {
      businessLambdas.set(definition.id, createLambda(definition));
    });

    const getBusinessLambda = (id: string): lambda.IFunction => {
      const fn = businessLambdas.get(id);
      if (!fn) {
        throw new Error(`Missing Lambda registration for ${id}`);
      }
      return fn;
    };

    // Account deletion — requires read+write on all user tables AND Cognito AdminDeleteUser.
    // DynamoDB is deleted first; Cognito is deleted second (per architecture spec).
    const deleteAccountFn = getBusinessLambda('DeleteAccountFn');
    deleteAccountFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminDeleteUser'],
        resources: [
          `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${props.authStack.userPool.userPoolId}`,
        ],
      }),
    );

    const healthFn = createLambda({
      id: 'HealthFn',
      entryPath: 'shared/infrastructure/handlers/health.handler.ts',
      context: 'shared',
    });

    const addRoute = (
      routePath: string,
      method: apigatewayv2.HttpMethod,
      fn: lambda.IFunction,
      integrationId: string,
    ) => {
      api.addRoutes({
        path: `${API_VERSION}${routePath}`,
        methods: [method],
        integration: new apigatewayv2_integrations.HttpLambdaIntegration(integrationId, fn),
        authorizer,
      });
    };

    const routes: RouteDefinition[] = [
      {
        path: '/salah/log',
        method: apigatewayv2.HttpMethod.POST,
        lambdaId: 'LogPrayerFn',
        integrationId: 'LogPrayerIntegration',
      },
      {
        path: '/salah/log',
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'DeletePrayerLogFn',
        integrationId: 'DeletePrayerLogIntegration',
      },
      {
        path: '/salah/logs',
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'ResetPrayerLogsFn',
        integrationId: 'ResetPrayerLogsIntegration',
      },
      {
        path: '/salah/debt',
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetSalahDebtFn',
        integrationId: 'GetSalahDebtIntegration',
      },
      {
        path: '/salah/history',
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetPrayerHistoryFn',
        integrationId: 'GetPrayerHistoryIntegration',
      },
      {
        path: '/salah/history/page',
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetPrayerHistoryPageFn',
        integrationId: 'GetPrayerHistoryPageIntegration',
      },
      {
        path: '/sawm/log',
        method: apigatewayv2.HttpMethod.POST,
        lambdaId: 'LogFastFn',
        integrationId: 'LogFastIntegration',
      },
      {
        path: '/sawm/log',
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'DeleteFastLogFn',
        integrationId: 'DeleteFastLogIntegration',
      },
      {
        path: '/sawm/logs',
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'ResetFastLogsFn',
        integrationId: 'ResetFastLogsIntegration',
      },
      {
        path: '/sawm/debt',
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetSawmDebtFn',
        integrationId: 'GetSawmDebtIntegration',
      },
      {
        path: '/sawm/history',
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetFastHistoryFn',
        integrationId: 'GetFastHistoryIntegration',
      },
      {
        path: '/sawm/history/page',
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetFastHistoryPageFn',
        integrationId: 'GetFastHistoryPageIntegration',
      },
      {
        path: '/salah/practicing-period',
        method: apigatewayv2.HttpMethod.POST,
        lambdaId: 'AddPeriodFn',
        integrationId: 'AddPeriodIntegration',
      },
      {
        path: '/salah/practicing-period',
        method: apigatewayv2.HttpMethod.PUT,
        lambdaId: 'UpdatePeriodFn',
        integrationId: 'UpdatePeriodIntegration',
      },
      {
        path: '/salah/practicing-periods',
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetPeriodsFn',
        integrationId: 'GetPeriodsIntegration',
      },
      {
        path: '/salah/practicing-period',
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'DeletePeriodFn',
        integrationId: 'DeletePeriodIntegration',
      },
      {
        path: '/user/profile',
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetUserSettingsFn',
        integrationId: 'GetUserSettingsIntegration',
      },
      {
        path: '/user/profile',
        method: apigatewayv2.HttpMethod.POST,
        lambdaId: 'UpdateUserSettingsFn',
        integrationId: 'UpdateUserSettingsIntegration',
      },
      {
        path: '/user/account',
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'DeleteAccountFn',
        integrationId: 'DeleteAccountIntegration',
      },
      {
        path: '/user/export',
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'ExportDataFn',
        integrationId: 'ExportDataIntegration',
      },
    ];

    routes.forEach(({ path: routePath, method, lambdaId, integrationId }) => {
      addRoute(routePath, method, getBusinessLambda(lambdaId), integrationId);
    });

    api.addRoutes({
      path: '/health',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration(
        'HealthIntegration',
        healthFn,
      ),
    });

    // Expose all business Lambda functions so AlarmStack can create per-function alarms.
    // Health function is intentionally excluded — it never fails in ways requiring alerts.
    this.lambdaFunctions = businessLambdaDefinitions.map(({ id: lambdaId }) =>
      getBusinessLambda(lambdaId),
    );
    this.lambdaMonitoringConfigs = businessLambdaDefinitions.map((definition) => ({
      function: getBusinessLambda(definition.id),
      durationAlarmThresholdMs:
        definition.durationAlarmThresholdMs ?? config.defaultLambdaDurationAlarmMs,
      concurrencyAlarmThreshold: definition.concurrencyAlarmThreshold,
    }));

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
  }
}
