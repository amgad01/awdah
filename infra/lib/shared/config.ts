import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface ProjectConfig {
  readonly envName: string;
  readonly lambdaTimeout: cdk.Duration;
  readonly apiThrottle: {
    readonly rateLimit: number;
    readonly burstLimit: number;
  };
  readonly protectedMutationConcurrency?: number;
  readonly adminOperationConcurrency?: number;
  readonly heavyOperationTimeout: cdk.Duration;
  readonly heavyOperationMemorySize: number;
  readonly apiLatencyAlarmMs: number;
  readonly apiIntegrationLatencyAlarmMs: number;
  readonly defaultLambdaDurationAlarmMs: number;
  readonly heavyLambdaDurationAlarmMs: number;
  readonly allowedOrigins: string[];
}

export const CONFIG: Record<string, ProjectConfig> = {
  dev: {
    envName: 'dev',
    lambdaTimeout: cdk.Duration.seconds(30), // More generous for LocalStack/Dev
    apiThrottle: {
      rateLimit: 250,
      burstLimit: 500,
    },
    heavyOperationTimeout: cdk.Duration.seconds(30),
    heavyOperationMemorySize: 512,
    apiLatencyAlarmMs: 3000,
    apiIntegrationLatencyAlarmMs: 2500,
    defaultLambdaDurationAlarmMs: 8000,
    heavyLambdaDurationAlarmMs: 15000,
    allowedOrigins: ['http://localhost:5173', 'http://localhost:3000'],
  },
  staging: {
    envName: 'staging',
    lambdaTimeout: cdk.Duration.seconds(10),
    apiThrottle: {
      rateLimit: 75,
      burstLimit: 150,
    },
    heavyOperationTimeout: cdk.Duration.seconds(20),
    heavyOperationMemorySize: 512,
    apiLatencyAlarmMs: 2000,
    apiIntegrationLatencyAlarmMs: 1500,
    defaultLambdaDurationAlarmMs: 4000,
    heavyLambdaDurationAlarmMs: 10000,
    allowedOrigins: [],
  },
  prod: {
    envName: 'prod',
    lambdaTimeout: cdk.Duration.seconds(10),
    apiThrottle: {
      rateLimit: 100,
      burstLimit: 200,
    },
    protectedMutationConcurrency: 2,
    adminOperationConcurrency: 2,
    heavyOperationTimeout: cdk.Duration.seconds(20),
    heavyOperationMemorySize: 512,
    apiLatencyAlarmMs: 1500,
    apiIntegrationLatencyAlarmMs: 1200,
    defaultLambdaDurationAlarmMs: 4000,
    heavyLambdaDurationAlarmMs: 10000,
    // GitHub Pages host for the SPA in prod. CloudFront is added dynamically via context.
    allowedOrigins: ['https://amgad01.github.io'],
  },
};

export function getConfig(scope: Construct): ProjectConfig {
  // Prefer explicit CDK context values first, then fall back to NODE_ENV.
  const ctxEnv = scope.node.tryGetContext('env') || process.env.NODE_ENV;
  const env = (ctxEnv as string) || 'dev';
  const cfg = CONFIG[env as keyof typeof CONFIG];
  return (cfg ?? CONFIG.dev) as ProjectConfig;
}

/** Deployment-specific configuration extracted from context. */
export interface DeploymentConfig {
  environment: string;
  ticket?: string;
  commit?: string;
  buildId?: string;
  releaseTag?: string;
  alertEmail?: string;
  frontend: {
    deploy: boolean;
    origin?: string;
    domainName?: string;
    hostedZoneName?: string;
    hostedZoneId?: string;
    certificateArn?: string;
  };
}

/**
 * Extracts and parses project deployment configuration from CDK context.
 */
export function loadDeploymentConfig(app: cdk.App): DeploymentConfig {
  const get = (key: string) => app.node.tryGetContext(key);

  return {
    environment: get('env') || 'dev',
    ticket: get('ticket'),
    commit: get('commit'),
    buildId: get('buildId'),
    releaseTag: get('releaseTag'),
    alertEmail: get('alertEmail'),
    frontend: {
      deploy: get('deployFrontend') === true || get('deployFrontend') === 'true',
      origin: get('frontendOrigin'),
      domainName: get('frontendDomainName'),
      hostedZoneName: get('frontendHostedZoneName'),
      hostedZoneId: get('frontendHostedZoneId'),
      certificateArn: get('frontendCertificateArn'),
    },
  };
}

/**
 * Validates deployment configuration values.
 */
export function validateDeploymentConfig(config: DeploymentConfig): void {
  const { origin } = config.frontend;
  if (origin && !origin.startsWith('https://') && !origin.startsWith('http://')) {
    throw new Error(
      `Invalid frontendOrigin context value "${origin}". Origins must start with "https://" or "http://".`,
    );
  }
}

/**
 * Applies standard tags and metadata from configuration to all resources in the app.
 */
export function applyGlobalTags(app: cdk.App, config: DeploymentConfig): void {
  const tags = cdk.Tags.of(app);
  tags.add('project', 'Awdah');
  tags.add('env', config.environment);
  tags.add('owner', 'Amgad Mahmoud');

  if (config.ticket) tags.add('ticket', config.ticket);
  if (config.commit) tags.add('commit', config.commit);
  if (config.buildId) tags.add('buildId', config.buildId);
  if (config.releaseTag) tags.add('release', config.releaseTag);
}
