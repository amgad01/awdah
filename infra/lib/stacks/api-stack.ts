import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';
import { DataStack } from './data-stack';
import { AuthStack } from './auth-stack';
import { BaseStack, BaseStackProps } from '../shared/base-stack';
import { ProjectResourceFactory } from '../shared/resource-factory';
import { getConfig, type ProjectConfig } from '../shared/config';
import { CONTEXT } from '../shared/constants';
import { SalahConstruct } from '../constructs/salah-construct';
import { SawmConstruct } from '../constructs/sawm-construct';
import { UserConstruct } from '../constructs/user-construct';
import { DependenciesLayer } from '../shared/dependencies-layer';

export interface ApiStackProps extends BaseStackProps {
  dataStack: DataStack;
  authStack: AuthStack;
  frontendOrigin?: string;
}

const MUTATION_ROUTE_RATE_DIVISOR = 5;
const ADMIN_ROUTE_RATE_DIVISOR = 20;
const WARM_LAMBDA_INTERVAL_MINUTES = 15;
const WARM_LAMBDA_IDS = [
  'GetUserSettingsFn',
  'GetSalahDebtFn',
  'GetSawmDebtFn',
  'GetPeriodsFn',
] as const;

export class ApiStack extends BaseStack {
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly defaultStage: apigatewayv2.HttpStage;
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

    const dependenciesLayer = new DependenciesLayer(this, 'SharedDependencies', this.projectEnv);

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
    const sharedEnv = {
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

    // 3. Register Bounded contexts
    const salah = new SalahConstruct(this, 'Salah', {
      api,
      authorizer,
      dataStack: props.dataStack,
      authStack: props.authStack,
      projectEnv: this.projectEnv,
      resourceScope: this,
      depsLayer: dependenciesLayer.layerVersion,
    });

    const sawm = new SawmConstruct(this, 'Sawm', {
      api,
      authorizer,
      dataStack: props.dataStack,
      authStack: props.authStack,
      projectEnv: this.projectEnv,
      resourceScope: this,
      depsLayer: dependenciesLayer.layerVersion,
    });

    const user = new UserConstruct(this, 'User', {
      api,
      authorizer,
      dataStack: props.dataStack,
      authStack: props.authStack,
      projectEnv: this.projectEnv,
      resourceScope: this,
      depsLayer: dependenciesLayer.layerVersion,
    });
    this.lifecycleJobDlq = user.lifecycleJobDlq;

    // 4. Register Shared/Generic Lambdas
    const healthFn = ProjectResourceFactory.createNodejsFunction(
      this,
      'HealthFn',
      {
        entry: path.join(backendSrc, 'shared/infrastructure/handlers/health.handler.ts'),
        context: CONTEXT.SHARED,
        environment: sharedEnv,
      },
      this.projectEnv,
    );

    const healthRoutes = api.addRoutes({
      path: '/health',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration(
        'HealthIntegration',
        healthFn,
      ),
    });

    const lambdaById = new Map<string, lambda.Function>([
      ...salah.functions.entries(),
      ...sawm.functions.entries(),
      ...user.functions.entries(),
      ['HealthFn', healthFn],
    ]);

    const routes = [...salah.routes, ...sawm.routes, ...user.routes, ...healthRoutes];
    this.applyRouteThrottles(config, routes);
    this.registerWarmLambdaRule(lambdaById);

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

  private applyRouteThrottles(config: ProjectConfig, routes: apigatewayv2.HttpRoute[]): void {
    const cfnStage = this.defaultStage.node.defaultChild as apigatewayv2.CfnStage;
    const mutationRateLimit = Math.max(
      10,
      Math.floor(config.apiThrottle.rateLimit / MUTATION_ROUTE_RATE_DIVISOR),
    );
    const mutationBurstLimit = Math.max(
      20,
      Math.floor(config.apiThrottle.burstLimit / MUTATION_ROUTE_RATE_DIVISOR),
    );
    const adminRateLimit = Math.max(
      4,
      Math.floor(config.apiThrottle.rateLimit / ADMIN_ROUTE_RATE_DIVISOR),
    );
    const adminBurstLimit = Math.max(
      8,
      Math.floor(config.apiThrottle.burstLimit / ADMIN_ROUTE_RATE_DIVISOR),
    );

    const routeSettings: Record<
      string,
      {
        ThrottlingBurstLimit: number;
        ThrottlingRateLimit: number;
      }
    > = {};
    const protectedMutationRoutes = [
      'POST /v1/salah/log',
      'DELETE /v1/salah/log',
      'POST /v1/salah/practicing-period',
      'PUT /v1/salah/practicing-period',
      'DELETE /v1/salah/practicing-period',
      'POST /v1/sawm/log',
      'DELETE /v1/sawm/log',
      'POST /v1/user/profile',
    ];
    const adminMutationRoutes = [
      'DELETE /v1/salah/logs',
      'DELETE /v1/sawm/logs',
      'DELETE /v1/user/account',
      'DELETE /v1/user/account/auth',
      'POST /v1/user/export',
    ];

    protectedMutationRoutes.forEach((routeKey) => {
      routeSettings[routeKey] = {
        ThrottlingBurstLimit: mutationBurstLimit,
        ThrottlingRateLimit: mutationRateLimit,
      };
    });

    adminMutationRoutes.forEach((routeKey) => {
      routeSettings[routeKey] = {
        ThrottlingBurstLimit: adminBurstLimit,
        ThrottlingRateLimit: adminRateLimit,
      };
    });

    cfnStage.routeSettings = routeSettings;

    routes.forEach((route) => {
      cfnStage.addDependency(route.node.defaultChild as cdk.CfnResource);
    });
  }

  private registerWarmLambdaRule(lambdas: Map<string, lambda.IFunction>): void {
    if (this.projectEnv !== 'prod') {
      return;
    }

    new events.Rule(this, 'CriticalReadWarmupRule', {
      ruleName: this.fullResourceName('CriticalReadWarmup'),
      description:
        'Keeps the key dashboard and settings read Lambdas warm without provisioned concurrency.',
      schedule: events.Schedule.rate(cdk.Duration.minutes(WARM_LAMBDA_INTERVAL_MINUTES)),
      targets: WARM_LAMBDA_IDS.map((lambdaId) => {
        const fn = lambdas.get(lambdaId);
        if (!fn) {
          throw new Error(`Missing warmup Lambda function: ${lambdaId}`);
        }

        return new targets.LambdaFunction(fn, {
          event: events.RuleTargetInput.fromObject({
            warmup: true,
            source: 'awdah.lambda-warmer',
            target: lambdaId,
          }),
        });
      }),
    });
  }
}
