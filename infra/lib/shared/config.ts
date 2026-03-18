import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface ProjectConfig {
  readonly envName: string;
  readonly lambdaTimeout: cdk.Duration;
}

export const CONFIG: Record<string, ProjectConfig> = {
  dev: {
    envName: 'dev',
    lambdaTimeout: cdk.Duration.seconds(30), // More generous for LocalStack/Dev
  },
  staging: {
    envName: 'staging',
    lambdaTimeout: cdk.Duration.seconds(10),
  },
  prod: {
    envName: 'prod',
    lambdaTimeout: cdk.Duration.seconds(10),
  },
};

export function getConfig(scope: Construct): ProjectConfig {
  // Prefer the explicit 'appEnv' context used in infra/bin/app.ts, then
  // fall back to 'env' for compatibility with other contexts. Finally fall
  // back to process.env.NODE_ENV and 'dev' as a last resort.
  const ctxEnv =
    scope.node.tryGetContext('appEnv') || scope.node.tryGetContext('env') || process.env.NODE_ENV;
  const env = (ctxEnv as string) || 'dev';
  const cfg = CONFIG[env as keyof typeof CONFIG];
  return (cfg ?? CONFIG.dev) as ProjectConfig;
}
