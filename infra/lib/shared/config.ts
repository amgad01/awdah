import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface ProjectConfig {
  readonly envName: string;
  readonly lambdaTimeout: cdk.Duration;
  readonly apiThrottle: {
    readonly rateLimit: number;
    readonly burstLimit: number;
  };
  readonly protectedMutationConcurrency: number;
  readonly adminOperationConcurrency: number;
  readonly heavyOperationTimeout: cdk.Duration;
  readonly heavyOperationMemorySize: number;
  readonly apiLatencyAlarmMs: number;
  readonly apiIntegrationLatencyAlarmMs: number;
  readonly defaultLambdaDurationAlarmMs: number;
  readonly heavyLambdaDurationAlarmMs: number;
}

export const CONFIG: Record<string, ProjectConfig> = {
  dev: {
    envName: 'dev',
    lambdaTimeout: cdk.Duration.seconds(30), // More generous for LocalStack/Dev
    apiThrottle: {
      rateLimit: 250,
      burstLimit: 500,
    },
    protectedMutationConcurrency: 1,
    adminOperationConcurrency: 1,
    heavyOperationTimeout: cdk.Duration.seconds(30),
    heavyOperationMemorySize: 512,
    apiLatencyAlarmMs: 3000,
    apiIntegrationLatencyAlarmMs: 2500,
    defaultLambdaDurationAlarmMs: 8000,
    heavyLambdaDurationAlarmMs: 15000,
  },
  staging: {
    envName: 'staging',
    lambdaTimeout: cdk.Duration.seconds(10),
    apiThrottle: {
      rateLimit: 75,
      burstLimit: 150,
    },
    protectedMutationConcurrency: 1,
    adminOperationConcurrency: 1,
    heavyOperationTimeout: cdk.Duration.seconds(20),
    heavyOperationMemorySize: 512,
    apiLatencyAlarmMs: 2000,
    apiIntegrationLatencyAlarmMs: 1500,
    defaultLambdaDurationAlarmMs: 4000,
    heavyLambdaDurationAlarmMs: 10000,
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
  },
};

export function getConfig(scope: Construct): ProjectConfig {
  // Prefer explicit CDK context values first, then fall back to NODE_ENV.
  const ctxEnv =
    scope.node.tryGetContext('env') || scope.node.tryGetContext('appEnv') || process.env.NODE_ENV;
  const env = (ctxEnv as string) || 'dev';
  const cfg = CONFIG[env as keyof typeof CONFIG];
  return (cfg ?? CONFIG.dev) as ProjectConfig;
}
