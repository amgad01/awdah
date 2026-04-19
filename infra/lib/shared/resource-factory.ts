import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { readFileSync } from 'node:fs';
import { Construct } from 'constructs';
import * as path from 'path';
import { getConfig } from './config';

export interface LambdaOptions {
  entry: string;
  handler?: string;
  memorySize?: number;
  timeout?: cdk.Duration;
  environment?: Record<string, string>;
  deadLetterQueue?: cdk.aws_sqs.IQueue;
  retryAttempts?: number;
  context?: string;
  reservedConcurrentExecutions?: number;
  layers?: lambda.ILayerVersion[];
  enableRecursiveLoopDetection?: boolean;
  logRetention?: logs.RetentionDays;
}

export interface DynamoDBTableOptions {
  stream?: dynamodb.StreamViewType;
  timeToLiveAttribute?: string;
  pointInTimeRecoveryEnabled?: boolean;
}

/**
 * Factory for creating standardized AWS resources with project defaults.
 */
export class ProjectResourceFactory {
  private static getLayerDependencies(): string[] {
    const layerPackagePath = path.join(
      __dirname,
      '../../../apps/backend/layer/nodejs/package.json',
    );
    const layerPackage = JSON.parse(readFileSync(layerPackagePath, 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    return Object.keys(layerPackage.dependencies ?? {});
  }

  private static getDefaultLogRetention(projectEnv: string): logs.RetentionDays {
    switch (projectEnv) {
      case 'dev':
        return logs.RetentionDays.ONE_DAY;
      case 'staging':
        return logs.RetentionDays.ONE_WEEK;
      case 'prod':
      default:
        return logs.RetentionDays.ONE_MONTH;
    }
  }

  /**
   * Creates a Node.js Lambda function with project-standard props.
   */
  public static createNodejsFunction(
    scope: Construct,
    id: string,
    options: LambdaOptions,
    projectEnv?: string,
    architecture: lambda.Architecture = lambda.Architecture.ARM_64,
  ): lambda_nodejs.NodejsFunction {
    const config = getConfig(scope);
    const effectiveLogRetention =
      options.logRetention ??
      (projectEnv ? this.getDefaultLogRetention(projectEnv) : logs.RetentionDays.ONE_MONTH);

    const logGroup = new logs.LogGroup(scope, `${id}LogGroup`, {
      retention: effectiveLogRetention,
    });

    const externalModules = ['@aws-sdk/*'];
    if (options.layers && options.layers.length > 0) {
      externalModules.push(...this.getLayerDependencies());
    }

    // ARM_64: ~34% cheaper than x86 for the same Lambda workload.
    const fn = new lambda_nodejs.NodejsFunction(scope, id, {
      entry: options.entry,
      handler: options.handler ?? 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: architecture,
      memorySize: options.memorySize ?? 256,
      timeout: options.timeout ?? config.lambdaTimeout,
      // Active tracing enables X-Ray service-map visualisation.
      tracing: lambda.Tracing.ACTIVE,
      recursiveLoop: options.enableRecursiveLoopDetection
        ? lambda.RecursiveLoop.TERMINATE
        : undefined,
      logGroup,
      environment: options.environment,
      deadLetterQueue: options.deadLetterQueue,
      retryAttempts: options.retryAttempts,
      reservedConcurrentExecutions: options.reservedConcurrentExecutions,
      layers: options.layers,
      bundling: {
        minify: true,
        sourceMap: true,
        // Exclude the AWS SDK v3 — Lambda runtime already includes it.
        // This shrinks bundles and avoids mismatched SDK versions.
        externalModules: Array.from(new Set(externalModules)),
      },
    });

    if (options.context) {
      cdk.Tags.of(fn).add('context', options.context);
    }

    return fn;
  }

  /**
   * Creates an S3 Bucket with project-standard encryption and removal policy.
   */
  public static createS3Bucket(
    scope: Construct,
    id: string,
    bucketName: string,
    removalPolicy: cdk.RemovalPolicy,
    blockPublicAccess: boolean = true,
  ): s3.Bucket {
    return new s3.Bucket(scope, id, {
      bucketName,
      removalPolicy,
      // Auto-delete empties the bucket before deletion (dev/staging only).
      autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,
      versioned: true,
      // SSE-S3: zero-cost default encryption. KMS would add per-request cost.
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: blockPublicAccess ? s3.BlockPublicAccess.BLOCK_ALL : undefined,
      // enforceSSL rejects any non-HTTPS PutObject — defense in depth.
      enforceSSL: true,
    });
  }

  /**
   * Creates a DynamoDB Table with project-standard PITR and billing mode.
   */
  public static createDynamoDBTable(
    scope: Construct,
    id: string,
    tableName: string,
    partitionKey: dynamodb.Attribute,
    sortKey: dynamodb.Attribute | undefined,
    removalPolicy: cdk.RemovalPolicy,
    options: DynamoDBTableOptions = {},
  ): dynamodb.Table {
    return new dynamodb.Table(scope, id, {
      tableName,
      partitionKey,
      sortKey,
      // PAY_PER_REQUEST: no capacity planning, ideal for unpredictable
      // workloads. We accept slightly higher per-request cost in exchange
      // for zero manual scaling and no provisioned-capacity alarms.
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // PITR enabled by default — allows point-in-time recovery up to 35 days.
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: options.pointInTimeRecoveryEnabled ?? true,
      },
      removalPolicy,
      stream: options.stream,
      timeToLiveAttribute: options.timeToLiveAttribute,
    });
  }
}
