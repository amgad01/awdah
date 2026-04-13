import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';
import { DataStack } from './data-stack';
import { AuthStack } from './auth-stack';
import { BaseStack, BaseStackProps } from '../shared/base-stack';
import { ProjectResourceFactory } from '../shared/resource-factory';
import { getConfig } from '../shared/config';
import { CONTEXT } from '../shared/constants';
import { SalahConstruct } from '../constructs/salah-construct';
import { SawmConstruct } from '../constructs/sawm-construct';
import { UserConstruct } from '../constructs/user-construct';

export interface ApiStackProps extends BaseStackProps {
  dataStack: DataStack;
  authStack: AuthStack;
  frontendOrigin?: string;
}

export class ApiStack extends BaseStack {
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly defaultStage: apigatewayv2.HttpStage;
  public readonly lambdaFunctions: lambda.IFunction[];
  public readonly lambdaMonitoringConfigs: Array<{
    function: lambda.IFunction;
    durationAlarmThresholdMs: number;
    concurrencyAlarmThreshold?: number;
  }> = [];
  private _lifecycleJobDlq?: sqs.Queue;

  public get lifecycleJobDlq(): sqs.Queue {
    if (!this._lifecycleJobDlq) {
      throw new Error('ApiStack.lifecycleJobDlq was accessed before it was initialized.');
    }

    return this._lifecycleJobDlq;
  }

  public get hasLifecycleJobDlq(): boolean {
    return this._lifecycleJobDlq !== undefined;
  }

  public set lifecycleJobDlq(queue: sqs.Queue) {
    this._lifecycleJobDlq = queue;
  }

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

    const backendSrc = path.join(__dirname, '../../../apps/backend/src');

    // 3. Register Bounded contexts
    const salah = new SalahConstruct(this, 'Salah', {
      api,
      authorizer,
      dataStack: props.dataStack,
      authStack: props.authStack,
      projectEnv: this.projectEnv,
    });

    const sawm = new SawmConstruct(this, 'Sawm', {
      api,
      authorizer,
      dataStack: props.dataStack,
      authStack: props.authStack,
      projectEnv: this.projectEnv,
    });

    const user = new UserConstruct(this, 'User', {
      api,
      authorizer,
      dataStack: props.dataStack,
      authStack: props.authStack,
      projectEnv: this.projectEnv,
    });

    // 4. Register Shared/Generic Lambdas
    const healthFn = ProjectResourceFactory.createNodejsFunction(this, 'HealthFn', {
      entry: path.join(backendSrc, 'shared/infrastructure/handlers/health.handler.ts'),
      context: CONTEXT.SHARED,
      environment: {
        NODE_ENV: this.projectEnv,
        LOG_LEVEL: this.projectEnv === 'prod' ? 'info' : 'debug',
      },
    });

    api.addRoutes({
      path: '/health',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration(
        'HealthIntegration',
        healthFn,
      ),
    });

    // 5. Collect for monitoring
    this.lambdaFunctions = [
      ...salah.functions.values(),
      ...sawm.functions.values(),
      ...user.functions.values(),
      healthFn,
    ];

    // TODO: Migrate Alarms/Monitoring to use this.lambdaFunctions
    // and this.lambdaMonitoringConfigs populated within constructs.

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });

    new ssm.StringParameter(this, 'ApiUrlParameter', {
      parameterName: `/awdah/${this.projectEnv}/api/url`,
      stringValue: api.apiEndpoint,
      description: `Awdah API Endpoint (${this.projectEnv})`,
    });
  }

  private createHttpApi(props: ApiStackProps): apigatewayv2.HttpApi {
    const config = getConfig(this);
    const origins = new Set([
      ...config.allowedOrigins,
      ...(props.frontendOrigin ? [props.frontendOrigin] : []),
    ]);

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
        allowCredentials: true,
        allowOrigins: Array.from(origins),
      },
    });
  }
}
