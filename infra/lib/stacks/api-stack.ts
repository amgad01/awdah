import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { DataStack } from './data-stack';
import { AuthStack } from './auth-stack';

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
  dataStack: DataStack;
  authStack: AuthStack;
  ticket?: string;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('context', 'api');

    const resourcePrefix = props.ticket ? `${props.ticket}-` : '';

    const api = new apigatewayv2.HttpApi(this, 'AwdahApi', {
      apiName: `${resourcePrefix}Awdah-API-${props.environment}`,
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
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins:
          props.environment === 'prod'
            ? ['https://awdah.app']
            : props.environment === 'staging'
              ? ['https://staging.awdah.app']
              : ['http://localhost:5173'],
      },
    });

    new apigatewayv2.HttpStage(this, 'DefaultStage', {
      httpApi: api,
      stageName: '$default',
      autoDeploy: true,
      throttle: {
        burstLimit: props.environment === 'prod' ? 200 : 500,
        rateLimit: props.environment === 'prod' ? 100 : 250,
      },
    });

    const authorizer = new HttpUserPoolAuthorizer('AwdahAuthorizer', props.authStack.userPool, {
      userPoolClients: [props.authStack.userPoolClient],
    });

    const API_VERSION = '/v1';

    const lambdaProps: Partial<lambda_nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
      environment: {
        NODE_ENV: props.environment,
        PRAYER_LOGS_TABLE: props.dataStack.prayerLogsTable.tableName,
        FAST_LOGS_TABLE: props.dataStack.fastLogsTable.tableName,
        PRACTICING_PERIODS_TABLE: props.dataStack.practicingPeriodsTable.tableName,
        USER_SETTINGS_TABLE: props.dataStack.userSettingsTable.tableName,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    };

    const backendSrc = path.join(__dirname, '../../../apps/backend/src');

    const createLambda = (
      id: string,
      entryPath: string,
      context: string,
      grantRead?: cdk.aws_dynamodb.ITable[],
      grantWrite?: cdk.aws_dynamodb.ITable[],
    ) => {
      const fn = new lambda_nodejs.NodejsFunction(this, id, {
        ...lambdaProps,
        entry: path.join(backendSrc, entryPath),
        handler: 'handler',
      });
      cdk.Tags.of(fn).add('context', context);
      grantRead?.forEach((table) => table.grantReadData(fn));
      grantWrite?.forEach((table) => table.grantReadWriteData(fn));
      return fn;
    };

    // 1. Log Prayer
    const logPrayerFn = createLambda(
      'LogPrayerFn',
      'contexts/salah/infrastructure/handlers/log-prayer.handler.ts',
      'salah',
      [],
      [props.dataStack.prayerLogsTable],
    );

    // 2. Get Salah Debt
    const getSalahDebtFn = createLambda(
      'GetSalahDebtFn',
      'contexts/salah/infrastructure/handlers/get-salah-debt.handler.ts',
      'salah',
      [
        props.dataStack.prayerLogsTable,
        props.dataStack.practicingPeriodsTable,
        props.dataStack.userSettingsTable,
      ],
    );

    // 3. Log Fast
    const logFastFn = createLambda(
      'LogFastFn',
      'contexts/sawm/infrastructure/handlers/log-fast.handler.ts',
      'sawm',
      [],
      [props.dataStack.fastLogsTable],
    );

    // 4. Get Sawm Debt
    const getSawmDebtFn = createLambda(
      'GetSawmDebtFn',
      'contexts/sawm/infrastructure/handlers/get-sawm-debt.handler.ts',
      'sawm',
      [
        props.dataStack.fastLogsTable,
        props.dataStack.practicingPeriodsTable,
        props.dataStack.userSettingsTable,
      ],
    );

    // 5. Add Practicing Period
    const addPeriodFn = createLambda(
      'AddPeriodFn',
      'contexts/salah/infrastructure/handlers/add-practicing-period.handler.ts',
      'salah',
      [],
      [props.dataStack.practicingPeriodsTable],
    );

    // 6. Get User Settings
    const getUserSettingsFn = createLambda(
      'GetUserSettingsFn',
      'contexts/user/infrastructure/handlers/get-user-settings.handler.ts',
      'user',
      [props.dataStack.userSettingsTable],
    );

    // 7. Update User Settings
    const updateUserSettingsFn = createLambda(
      'UpdateUserSettingsFn',
      'contexts/user/infrastructure/handlers/update-user-settings.handler.ts',
      'user',
      [],
      [props.dataStack.userSettingsTable],
    );

    // 8. Get Prayer History
    const getPrayerHistoryFn = createLambda(
      'GetPrayerHistoryFn',
      'contexts/salah/infrastructure/handlers/get-prayer-history.handler.ts',
      'salah',
      [props.dataStack.prayerLogsTable],
    );

    // 9. Get Fast History
    const getFastHistoryFn = createLambda(
      'GetFastHistoryFn',
      'contexts/sawm/infrastructure/handlers/get-fast-history.handler.ts',
      'sawm',
      [props.dataStack.fastLogsTable],
    );

    // 10. Delete Prayer Log
    const deletePrayerLogFn = createLambda(
      'DeletePrayerLogFn',
      'contexts/salah/infrastructure/handlers/delete-prayer-log.handler.ts',
      'salah',
      [],
      [props.dataStack.prayerLogsTable],
    );

    // 11. Delete Fast Log
    const deleteFastLogFn = createLambda(
      'DeleteFastLogFn',
      'contexts/sawm/infrastructure/handlers/delete-fast-log.handler.ts',
      'sawm',
      [],
      [props.dataStack.fastLogsTable],
    );

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

    // Routes
    addRoute('/salah/log', apigatewayv2.HttpMethod.POST, logPrayerFn, 'LogPrayerIntegration');
    addRoute('/salah/debt', apigatewayv2.HttpMethod.GET, getSalahDebtFn, 'GetSalahDebtIntegration');
    addRoute(
      '/salah/history',
      apigatewayv2.HttpMethod.GET,
      getPrayerHistoryFn,
      'GetPrayerHistoryIntegration',
    );
    addRoute('/sawm/log', apigatewayv2.HttpMethod.POST, logFastFn, 'LogFastIntegration');
    addRoute('/sawm/debt', apigatewayv2.HttpMethod.GET, getSawmDebtFn, 'GetSawmDebtIntegration');
    addRoute(
      '/sawm/history',
      apigatewayv2.HttpMethod.GET,
      getFastHistoryFn,
      'GetFastHistoryIntegration',
    );
    addRoute(
      '/salah/practicing-period',
      apigatewayv2.HttpMethod.POST,
      addPeriodFn,
      'AddPeriodIntegration',
    );
    addRoute(
      '/user/profile',
      apigatewayv2.HttpMethod.GET,
      getUserSettingsFn,
      'GetUserSettingsIntegration',
    );
    addRoute(
      '/user/profile',
      apigatewayv2.HttpMethod.POST,
      updateUserSettingsFn,
      'UpdateUserSettingsIntegration',
    );
    addRoute(
      '/salah/log',
      apigatewayv2.HttpMethod.DELETE,
      deletePrayerLogFn,
      'DeletePrayerLogIntegration',
    );
    addRoute(
      '/sawm/log',
      apigatewayv2.HttpMethod.DELETE,
      deleteFastLogFn,
      'DeleteFastLogIntegration',
    );

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
  }
}
