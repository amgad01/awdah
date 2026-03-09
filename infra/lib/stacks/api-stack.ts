import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { DataStack } from './data-stack';
import { AuthStack } from './auth-stack';

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
  dataStack: DataStack;
  authStack: AuthStack;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const api = new apigatewayv2.HttpApi(this, 'AwdahApi', {
      apiName: `Awdah-API-${props.environment}`,
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
    });

    const authorizer = new HttpUserPoolAuthorizer('AwdahAuthorizer', props.authStack.userPool, {
      userPoolClients: [props.authStack.userPoolClient],
    });

    const lambdaProps: Partial<lambda_nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
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
    };

    const backendSrc = path.join(__dirname, '../../../apps/backend/src');

    // 1. Log Prayer
    const logPrayerFn = new lambda_nodejs.NodejsFunction(this, 'LogPrayerFn', {
      ...lambdaProps,
      entry: path.join(backendSrc, 'contexts/salah/infrastructure/handlers/log-prayer.handler.ts'),
      handler: 'handler',
    });
    props.dataStack.prayerLogsTable.grantReadWriteData(logPrayerFn);

    // 2. Get Salah Debt
    const getSalahDebtFn = new lambda_nodejs.NodejsFunction(this, 'GetSalahDebtFn', {
      ...lambdaProps,
      entry: path.join(
        backendSrc,
        'contexts/salah/infrastructure/handlers/get-salah-debt.handler.ts',
      ),
      handler: 'handler',
    });
    props.dataStack.prayerLogsTable.grantReadData(getSalahDebtFn);
    props.dataStack.practicingPeriodsTable.grantReadData(getSalahDebtFn);
    props.dataStack.userSettingsTable.grantReadData(getSalahDebtFn);

    // 3. Log Fast
    const logFastFn = new lambda_nodejs.NodejsFunction(this, 'LogFastFn', {
      ...lambdaProps,
      entry: path.join(backendSrc, 'contexts/sawm/infrastructure/handlers/log-fast.handler.ts'),
      handler: 'handler',
    });
    props.dataStack.fastLogsTable.grantReadWriteData(logFastFn);

    // 4. Get Sawm Debt
    const getSawmDebtFn = new lambda_nodejs.NodejsFunction(this, 'GetSawmDebtFn', {
      ...lambdaProps,
      entry: path.join(
        backendSrc,
        'contexts/sawm/infrastructure/handlers/get-sawm-debt.handler.ts',
      ),
      handler: 'handler',
    });
    props.dataStack.fastLogsTable.grantReadData(getSawmDebtFn);
    props.dataStack.practicingPeriodsTable.grantReadData(getSawmDebtFn);
    props.dataStack.userSettingsTable.grantReadData(getSawmDebtFn);

    // 5. Add Practicing Period
    const addPeriodFn = new lambda_nodejs.NodejsFunction(this, 'AddPeriodFn', {
      ...lambdaProps,
      entry: path.join(
        backendSrc,
        'contexts/salah/infrastructure/handlers/add-practicing-period.handler.ts',
      ),
      handler: 'handler',
    });
    props.dataStack.practicingPeriodsTable.grantReadWriteData(addPeriodFn);

    // Routes
    api.addRoutes({
      path: '/salah/log',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration(
        'LogPrayerIntegration',
        logPrayerFn,
      ),
      authorizer,
    });

    api.addRoutes({
      path: '/salah/debt',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration(
        'GetSalahDebtIntegration',
        getSalahDebtFn,
      ),
      authorizer,
    });

    api.addRoutes({
      path: '/sawm/log',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration(
        'LogFastIntegration',
        logFastFn,
      ),
      authorizer,
    });

    api.addRoutes({
      path: '/sawm/debt',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration(
        'GetSawmDebtIntegration',
        getSawmDebtFn,
      ),
      authorizer,
    });

    api.addRoutes({
      path: '/salah/practicing-period',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration(
        'AddPeriodIntegration',
        addPeriodFn,
      ),
      authorizer,
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
  }
}
