import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';
import { getFullResourceName } from './naming';

/**
 * Shared Lambda Layer for common runtime dependencies.
 *
 * This layer contains dependencies that are used across multiple Lambda functions
 * but are not included in the AWS SDK v3 runtime (e.g., zod, pino, ulid).
 *
 * Benefits:
 * - Reduces individual Lambda bundle sizes by ~40-60KB per function
 * - Faster cold starts due to smaller deployment packages
 * - Centralized dependency management - single place to update shared packages
 * - No additional runtime cost (unlike provisioned concurrency)
 */
export class DependenciesLayer extends Construct {
  public readonly layerVersion: lambda.LayerVersion;

  constructor(scope: Construct, id: string, projectEnv: string) {
    super(scope, id);

    const layerDir = path.join(__dirname, '../../../apps/backend/layer');

    this.layerVersion = new lambda.LayerVersion(this, 'DependenciesLayer', {
      layerVersionName: getFullResourceName(this, 'shared-deps', projectEnv),
      code: lambda.Code.fromAsset(layerDir),
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      description: 'Shared dependencies for Awdah Lambda functions (zod, pino, ulid, etc.)',
      removalPolicy: projectEnv === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
  }
}
