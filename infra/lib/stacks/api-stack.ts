import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { DataStack } from './data-stack';
import { AuthStack } from './auth-stack';
import { BaseStack, BaseStackProps } from '../shared/base-stack';
import { ProjectResourceFactory } from '../shared/resource-factory';

export interface ApiStackProps extends BaseStackProps {
  dataStack: DataStack;
  authStack: AuthStack;
}

export class ApiStack extends BaseStack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.addContextTag('api');

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
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins:
          this.projectEnv === 'prod'
            ? ['https://awdah.app']
            : this.projectEnv === 'staging'
              ? ['https://staging.awdah.app']
              : ['http://localhost:5173'],
      },
    });

    new apigatewayv2.HttpStage(this, 'DefaultStage', {
      httpApi: api,
      stageName: '$default',
      autoDeploy: true,
      throttle: {
        burstLimit: this.projectEnv === 'prod' ? 200 : 500,
        rateLimit: this.projectEnv === 'prod' ? 100 : 250,
      },
    });

    const authorizer = new HttpUserPoolAuthorizer('AwdahAuthorizer', props.authStack.userPool, {
      userPoolClients: [props.authStack.userPoolClient],
    });

    const API_VERSION = '/v1';
    const backendSrc = path.join(__dirname, '../../../apps/backend/src');

    const sharedEnv = {
      NODE_ENV: this.projectEnv,
      PRAYER_LOGS_TABLE: props.dataStack.prayerLogsTable.tableName,
      FAST_LOGS_TABLE: props.dataStack.fastLogsTable.tableName,
      PRACTICING_PERIODS_TABLE: props.dataStack.practicingPeriodsTable.tableName,
      USER_SETTINGS_TABLE: props.dataStack.userSettingsTable.tableName,
    };

    const createLambda = (
      id: string,
      entryPath: string,
      context: string,
      grantRead?: cdk.aws_dynamodb.ITable[],
      grantWrite?: cdk.aws_dynamodb.ITable[],
    ) => {
      const fn = ProjectResourceFactory.createNodejsFunction(this, id, {
        entry: path.join(backendSrc, entryPath),
        context,
        environment: sharedEnv,
      });
      grantRead?.forEach((table) => table.grantReadData(fn));
      grantWrite?.forEach((table) => table.grantReadWriteData(fn));
      return fn;
    };

    // Lambda Handlers
    const logPrayerFn = createLambda(
      'LogPrayerFn',
      'contexts/salah/infrastructure/handlers/log-prayer.handler.ts',
      'salah',
      [],
      [props.dataStack.prayerLogsTable],
    );

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

    const logFastFn = createLambda(
      'LogFastFn',
      'contexts/sawm/infrastructure/handlers/log-fast.handler.ts',
      'sawm',
      [],
      [props.dataStack.fastLogsTable],
    );

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

    const addPeriodFn = createLambda(
      'AddPeriodFn',
      'contexts/salah/infrastructure/handlers/add-practicing-period.handler.ts',
      'salah',
      [],
      [props.dataStack.practicingPeriodsTable],
    );

    const getUserSettingsFn = createLambda(
      'GetUserSettingsFn',
      'contexts/user/infrastructure/handlers/get-user-settings.handler.ts',
      'user',
      [props.dataStack.userSettingsTable],
    );

    const updateUserSettingsFn = createLambda(
      'UpdateUserSettingsFn',
      'contexts/user/infrastructure/handlers/update-user-settings.handler.ts',
      'user',
      [],
      [props.dataStack.userSettingsTable],
    );

    const getPrayerHistoryFn = createLambda(
      'GetPrayerHistoryFn',
      'contexts/salah/infrastructure/handlers/get-prayer-history.handler.ts',
      'salah',
      [props.dataStack.prayerLogsTable],
    );

    const getFastHistoryFn = createLambda(
      'GetFastHistoryFn',
      'contexts/sawm/infrastructure/handlers/get-fast-history.handler.ts',
      'sawm',
      [props.dataStack.fastLogsTable],
    );

    const deletePrayerLogFn = createLambda(
      'DeletePrayerLogFn',
      'contexts/salah/infrastructure/handlers/delete-prayer-log.handler.ts',
      'salah',
      [],
      [props.dataStack.prayerLogsTable],
    );

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

    // Routes Definition
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
