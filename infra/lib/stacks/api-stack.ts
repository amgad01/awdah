import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_event_sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { DataStack } from './data-stack';
import { AuthStack } from './auth-stack';
import { BaseStack, BaseStackProps } from '../shared/base-stack';
import { ProjectResourceFactory } from '../shared/resource-factory';
import { getConfig, ProjectConfig } from '../shared/config';
import { CONTEXT, PATH } from '../shared/constants';

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
  public lifecycleJobDlq!: sqs.Queue;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.addContextTag('api');
    const config = getConfig(this);

    // 1. Setup API Gateway & Stage
    const api = this.createHttpApi(props);
    this.httpApi = api;

    this.defaultStage = new apigatewayv2.HttpStage(this, 'DefaultStage', {
      httpApi: api,
      stageName: '$default',
      autoDeploy: true,
      throttle: config.apiThrottle,
    });

    // 2. Setup Shared Configuration
    const authorizer = new HttpUserPoolAuthorizer('AwdahAuthorizer', props.authStack.userPool, {
      userPoolClients: [props.authStack.userPoolClient],
    });

    const sharedEnv = this.getSharedEnvironment(props);
    const definitions = this.getLambdaDefinitions(props, config);

    // 3. Register Business Lambdas
    const lambdas = this.registerBusinessLambdas(sharedEnv, definitions);

    // 4. Configure Specific Lambda Wiring
    this.wireLambdaPermissions(props, lambdas);
    this.wireEventSources(props, lambdas);

    // 5. Register Routes
    this.registerRoutes(api, authorizer, lambdas);

    // 6. Setup Monitoring Properties (Read-only)
    this.lambdaFunctions = definitions.map((def) => lambdas.get(def.id)!);
    this.lambdaMonitoringConfigs = definitions.map((def) => ({
      function: lambdas.get(def.id)!,
      durationAlarmThresholdMs: def.durationAlarmThresholdMs ?? config.defaultLambdaDurationAlarmMs,
      concurrencyAlarmThreshold: def.concurrencyAlarmThreshold,
    }));

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
  }

  private createHttpApi(props: ApiStackProps): apigatewayv2.HttpApi {
    const corsAllowedOrigins =
      this.projectEnv === 'prod'
        ? ['https://awdah.app']
        : this.projectEnv === 'staging'
          ? ['https://staging.awdah.app']
          : ['*'];

    return new apigatewayv2.HttpApi(this, 'AwdahApi', {
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
  }

  private getSharedEnvironment(props: ApiStackProps): Record<string, string> {
    return {
      NODE_ENV: this.projectEnv,
      LOG_LEVEL: this.projectEnv === 'prod' ? 'info' : 'debug',
      PRAYER_LOGS_TABLE: props.dataStack.prayerLogsTable.tableName,
      FAST_LOGS_TABLE: props.dataStack.fastLogsTable.tableName,
      PRACTICING_PERIODS_TABLE: props.dataStack.practicingPeriodsTable.tableName,
      USER_SETTINGS_TABLE: props.dataStack.userSettingsTable.tableName,
      USER_LIFECYCLE_JOBS_TABLE: props.dataStack.userLifecycleJobsTable.tableName,
      DELETED_USERS_TABLE: props.dataStack.deletedUsersTable.tableName,
      COGNITO_USER_POOL_ID: props.authStack.userPool.userPoolId,
    };
  }

  private registerBusinessLambdas(
    environment: Record<string, string>,
    definitions: LambdaDefinition[],
  ): Map<string, lambda.IFunction> {
    const backendSrc = path.join(__dirname, '../../../apps/backend/src');
    const lambdas = new Map<string, lambda.IFunction>();

    definitions.forEach((def) => {
      const fn = ProjectResourceFactory.createNodejsFunction(this, def.id, {
        entry: path.join(backendSrc, def.entryPath),
        context: def.context,
        environment,
        memorySize: def.memorySize,
        timeout: def.timeout,
        reservedConcurrentExecutions: def.reservedConcurrentExecutions,
      });

      def.readTables?.forEach((table) => table.grantReadData(fn));
      def.writeTables?.forEach((table) => table.grantReadWriteData(fn));

      lambdas.set(def.id, fn);
    });

    // Health function is registered separately (no business context needed)
    const healthFn = ProjectResourceFactory.createNodejsFunction(this, 'HealthFn', {
      entry: path.join(backendSrc, 'shared/infrastructure/handlers/health.handler.ts'),
      context: CONTEXT.SHARED,
      environment,
    });
    lambdas.set('HealthFn', healthFn);

    return lambdas;
  }

  private wireLambdaPermissions(
    props: ApiStackProps,
    lambdas: Map<string, lambda.IFunction>,
  ): void {
    const finalizeDeleteAccountFn = lambdas.get('FinalizeDeleteAccountFn');
    if (finalizeDeleteAccountFn) {
      finalizeDeleteAccountFn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['cognito-idp:AdminDeleteUser'],
          resources: [
            `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${props.authStack.userPool.userPoolId}`,
          ],
        }),
      );
    }
  }

  private wireEventSources(props: ApiStackProps, lambdas: Map<string, lambda.IFunction>): void {
    const processUserLifecycleJobFn = lambdas.get('ProcessUserLifecycleJobFn') as lambda.Function;
    if (processUserLifecycleJobFn) {
      this.lifecycleJobDlq = new sqs.Queue(this, 'LifecycleJobDLQ', {
        queueName: this.fullResourceName('lifecycle-job-dlq'),
        retentionPeriod: cdk.Duration.days(14),
        enforceSSL: true,
      });

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
  }

  private registerRoutes(
    api: apigatewayv2.HttpApi,
    authorizer: HttpUserPoolAuthorizer,
    lambdas: Map<string, lambda.IFunction>,
  ): void {
    const routes = this.getRouteDefinitions();
    routes.forEach((route) => {
      const fn = lambdas.get(route.lambdaId);
      if (!fn) throw new Error(`Missing Lambda function: ${route.lambdaId}`);

      api.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: new apigatewayv2_integrations.HttpLambdaIntegration(route.integrationId, fn),
        authorizer,
      });
    });

    // Health route is public
    api.addRoutes({
      path: '/health',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration(
        'HealthIntegration',
        lambdas.get('HealthFn')!,
      ),
    });
  }

  private getLambdaDefinitions(props: ApiStackProps, config: ProjectConfig): LambdaDefinition[] {
    const userReadTables = [
      props.dataStack.prayerLogsTable,
      props.dataStack.fastLogsTable,
      props.dataStack.practicingPeriodsTable,
      props.dataStack.userSettingsTable,
    ];

    return [
      // --- Salah Context ---
      {
        id: 'LogPrayerFn',
        entryPath: 'contexts/salah/infrastructure/handlers/log-prayer.handler.ts',
        context: CONTEXT.SALAH,
        writeTables: [props.dataStack.prayerLogsTable],
      },
      {
        id: 'GetSalahDebtFn',
        entryPath: 'contexts/salah/infrastructure/handlers/get-salah-debt.handler.ts',
        context: CONTEXT.SALAH,
        readTables: [
          props.dataStack.prayerLogsTable,
          props.dataStack.practicingPeriodsTable,
          props.dataStack.userSettingsTable,
        ],
      },
      {
        id: 'GetPrayerHistoryFn',
        entryPath: 'contexts/salah/infrastructure/handlers/get-prayer-history.handler.ts',
        context: CONTEXT.SALAH,
        readTables: [props.dataStack.prayerLogsTable],
      },
      {
        id: 'GetPrayerHistoryPageFn',
        entryPath: 'contexts/salah/infrastructure/handlers/get-prayer-history-page.handler.ts',
        context: CONTEXT.SALAH,
        readTables: [props.dataStack.prayerLogsTable],
      },
      {
        id: 'DeletePrayerLogFn',
        entryPath: 'contexts/salah/infrastructure/handlers/delete-prayer-log.handler.ts',
        context: CONTEXT.SALAH,
        writeTables: [props.dataStack.prayerLogsTable],
      },
      {
        id: 'ResetPrayerLogsFn',
        entryPath: 'contexts/salah/infrastructure/handlers/reset-prayer-logs.handler.ts',
        context: CONTEXT.SALAH,
        writeTables: [props.dataStack.userLifecycleJobsTable],
        memorySize: config.heavyOperationMemorySize,
        timeout: config.heavyOperationTimeout,
        reservedConcurrentExecutions: config.protectedMutationConcurrency,
        durationAlarmThresholdMs: config.heavyLambdaDurationAlarmMs,
        concurrencyAlarmThreshold: config.protectedMutationConcurrency,
      },
      {
        id: 'AddPeriodFn',
        entryPath: 'contexts/salah/infrastructure/handlers/add-practicing-period.handler.ts',
        context: CONTEXT.SALAH,
        readTables: [props.dataStack.userSettingsTable],
        writeTables: [props.dataStack.practicingPeriodsTable],
      },
      {
        id: 'UpdatePeriodFn',
        entryPath: 'contexts/salah/infrastructure/handlers/update-practicing-period.handler.ts',
        context: CONTEXT.SALAH,
        readTables: [props.dataStack.userSettingsTable, props.dataStack.practicingPeriodsTable],
        writeTables: [props.dataStack.practicingPeriodsTable],
      },
      {
        id: 'GetPeriodsFn',
        entryPath: 'contexts/salah/infrastructure/handlers/get-practicing-periods.handler.ts',
        context: CONTEXT.SALAH,
        readTables: [props.dataStack.practicingPeriodsTable],
      },
      {
        id: 'DeletePeriodFn',
        entryPath: 'contexts/salah/infrastructure/handlers/delete-practicing-period.handler.ts',
        context: CONTEXT.SALAH,
        writeTables: [props.dataStack.practicingPeriodsTable],
      },

      // --- Sawm Context ---
      {
        id: 'LogFastFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/log-fast.handler.ts',
        context: CONTEXT.SAWM,
        writeTables: [props.dataStack.fastLogsTable],
      },
      {
        id: 'GetSawmDebtFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/get-sawm-debt.handler.ts',
        context: CONTEXT.SAWM,
        readTables: [
          props.dataStack.fastLogsTable,
          props.dataStack.practicingPeriodsTable,
          props.dataStack.userSettingsTable,
        ],
      },
      {
        id: 'GetFastHistoryFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/get-fast-history.handler.ts',
        context: CONTEXT.SAWM,
        readTables: [props.dataStack.fastLogsTable],
      },
      {
        id: 'GetFastHistoryPageFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/get-fast-history-page.handler.ts',
        context: CONTEXT.SAWM,
        readTables: [props.dataStack.fastLogsTable],
      },
      {
        id: 'DeleteFastLogFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/delete-fast-log.handler.ts',
        context: CONTEXT.SAWM,
        writeTables: [props.dataStack.fastLogsTable],
      },
      {
        id: 'ResetFastLogsFn',
        entryPath: 'contexts/sawm/infrastructure/handlers/reset-fast-logs.handler.ts',
        context: CONTEXT.SAWM,
        writeTables: [props.dataStack.userLifecycleJobsTable],
        memorySize: config.heavyOperationMemorySize,
        timeout: config.heavyOperationTimeout,
        reservedConcurrentExecutions: config.protectedMutationConcurrency,
        durationAlarmThresholdMs: config.heavyLambdaDurationAlarmMs,
        concurrencyAlarmThreshold: config.protectedMutationConcurrency,
      },

      // --- User Context ---
      {
        id: 'GetUserSettingsFn',
        entryPath: 'contexts/user/infrastructure/handlers/get-user-settings.handler.ts',
        context: CONTEXT.USER,
        readTables: [props.dataStack.userSettingsTable],
      },
      {
        id: 'UpdateUserSettingsFn',
        entryPath: 'contexts/user/infrastructure/handlers/update-user-settings.handler.ts',
        context: CONTEXT.USER,
        writeTables: [props.dataStack.userSettingsTable],
      },
      {
        id: 'DeleteAccountFn',
        entryPath: 'contexts/user/infrastructure/handlers/delete-account.handler.ts',
        context: CONTEXT.USER,
        writeTables: [props.dataStack.userLifecycleJobsTable],
      },
      {
        id: 'ExportDataFn',
        entryPath: 'contexts/user/infrastructure/handlers/export-data.handler.ts',
        context: CONTEXT.USER,
        writeTables: [props.dataStack.userLifecycleJobsTable],
      },
      {
        id: 'GetUserLifecycleJobStatusFn',
        entryPath: 'contexts/user/infrastructure/handlers/get-user-lifecycle-job-status.handler.ts',
        context: CONTEXT.USER,
        readTables: [props.dataStack.userLifecycleJobsTable],
      },
      {
        id: 'DownloadExportDataFn',
        entryPath: 'contexts/user/infrastructure/handlers/download-export-data.handler.ts',
        context: CONTEXT.USER,
        readTables: [props.dataStack.userLifecycleJobsTable],
      },
      {
        id: 'FinalizeDeleteAccountFn',
        entryPath: 'contexts/user/infrastructure/handlers/finalize-delete-account.handler.ts',
        context: CONTEXT.USER,
        writeTables: [props.dataStack.userLifecycleJobsTable],
      },
      {
        id: 'ProcessUserLifecycleJobFn',
        entryPath: 'shared/infrastructure/handlers/process-user-lifecycle-job.handler.ts',
        context: CONTEXT.USER,
        writeTables: [
          props.dataStack.userLifecycleJobsTable,
          props.dataStack.deletedUsersTable,
          ...userReadTables,
        ],
        memorySize: config.heavyOperationMemorySize,
        timeout: config.heavyOperationTimeout,
        reservedConcurrentExecutions: config.adminOperationConcurrency,
        durationAlarmThresholdMs: config.heavyLambdaDurationAlarmMs,
        concurrencyAlarmThreshold: config.adminOperationConcurrency,
      },
    ];
  }

  private getRouteDefinitions(): RouteDefinition[] {
    const API_VERSION = '/v1';
    const buildPath = (context: string, subPath: string) => `${API_VERSION}/${context}${subPath}`;

    return [
      // --- Salah Routes ---
      {
        path: buildPath(CONTEXT.SALAH, PATH.LOG),
        method: apigatewayv2.HttpMethod.POST,
        lambdaId: 'LogPrayerFn',
        integrationId: 'LogPrayerIntegration',
      },
      {
        path: buildPath(CONTEXT.SALAH, PATH.LOG),
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'DeletePrayerLogFn',
        integrationId: 'DeletePrayerLogIntegration',
      },
      {
        path: buildPath(CONTEXT.SALAH, PATH.LOGS),
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'ResetPrayerLogsFn',
        integrationId: 'ResetPrayerLogsIntegration',
      },
      {
        path: buildPath(CONTEXT.SALAH, PATH.DEBT),
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetSalahDebtFn',
        integrationId: 'GetSalahDebtIntegration',
      },
      {
        path: buildPath(CONTEXT.SALAH, PATH.HISTORY),
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetPrayerHistoryFn',
        integrationId: 'GetPrayerHistoryIntegration',
      },
      {
        path: buildPath(CONTEXT.SALAH, PATH.HISTORY_PAGE),
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetPrayerHistoryPageFn',
        integrationId: 'GetPrayerHistoryPageIntegration',
      },
      {
        path: buildPath(CONTEXT.SALAH, PATH.PERIOD),
        method: apigatewayv2.HttpMethod.POST,
        lambdaId: 'AddPeriodFn',
        integrationId: 'AddPeriodIntegration',
      },
      {
        path: buildPath(CONTEXT.SALAH, PATH.PERIOD),
        method: apigatewayv2.HttpMethod.PUT,
        lambdaId: 'UpdatePeriodFn',
        integrationId: 'UpdatePeriodIntegration',
      },
      {
        path: buildPath(CONTEXT.SALAH, PATH.PERIODS),
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetPeriodsFn',
        integrationId: 'GetPeriodsIntegration',
      },
      {
        path: buildPath(CONTEXT.SALAH, PATH.PERIOD),
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'DeletePeriodFn',
        integrationId: 'DeletePeriodIntegration',
      },

      // --- Sawm Routes ---
      {
        path: buildPath(CONTEXT.SAWM, PATH.LOG),
        method: apigatewayv2.HttpMethod.POST,
        lambdaId: 'LogFastFn',
        integrationId: 'LogFastIntegration',
      },
      {
        path: buildPath(CONTEXT.SAWM, PATH.LOG),
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'DeleteFastLogFn',
        integrationId: 'DeleteFastLogIntegration',
      },
      {
        path: buildPath(CONTEXT.SAWM, PATH.LOGS),
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'ResetFastLogsFn',
        integrationId: 'ResetFastLogsIntegration',
      },
      {
        path: buildPath(CONTEXT.SAWM, PATH.DEBT),
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetSawmDebtFn',
        integrationId: 'GetSawmDebtIntegration',
      },
      {
        path: buildPath(CONTEXT.SAWM, PATH.HISTORY),
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetFastHistoryFn',
        integrationId: 'GetFastHistoryIntegration',
      },
      {
        path: buildPath(CONTEXT.SAWM, PATH.HISTORY_PAGE),
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetFastHistoryPageFn',
        integrationId: 'GetFastHistoryPageIntegration',
      },

      // --- User Routes ---
      {
        path: buildPath(CONTEXT.USER, PATH.PROFILE),
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetUserSettingsFn',
        integrationId: 'GetUserSettingsIntegration',
      },
      {
        path: buildPath(CONTEXT.USER, PATH.PROFILE),
        method: apigatewayv2.HttpMethod.POST,
        lambdaId: 'UpdateUserSettingsFn',
        integrationId: 'UpdateUserSettingsIntegration',
      },
      {
        path: buildPath(CONTEXT.USER, PATH.ACCOUNT),
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'DeleteAccountFn',
        integrationId: 'DeleteAccountIntegration',
      },
      {
        path: buildPath(CONTEXT.USER, PATH.ACCOUNT_AUTH),
        method: apigatewayv2.HttpMethod.DELETE,
        lambdaId: 'FinalizeDeleteAccountFn',
        integrationId: 'FinalizeDeleteAccountIntegration',
      },
      {
        path: buildPath(CONTEXT.USER, PATH.EXPORT),
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'DownloadExportDataFn',
        integrationId: 'DownloadExportDataIntegration',
      },
      {
        path: buildPath(CONTEXT.USER, PATH.EXPORT),
        method: apigatewayv2.HttpMethod.POST,
        lambdaId: 'ExportDataFn',
        integrationId: 'ExportDataIntegration',
      },
      {
        path: buildPath(CONTEXT.USER, PATH.STATUS),
        method: apigatewayv2.HttpMethod.GET,
        lambdaId: 'GetUserLifecycleJobStatusFn',
        integrationId: 'GetUserLifecycleJobStatusIntegration',
      },
    ];
  }
}
