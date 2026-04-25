import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
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
  /** Ephemeral storage size in MB (default: 512) */
  ephemeralStorageSize?: number;
  /** Create a live alias for this function */
  createAlias?: boolean;
  /** Alias name (default: 'live') */
  aliasName?: string;
  /** Enable Lambda Insights (CPU/Memory metrics) */
  enableInsights?: boolean;
  /** Enable recursive loop detection */
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
 * Optimized for cost-efficiency (free tier) and high performance (ARM64).
 */
export class ProjectResourceFactory {
  private static cachedLayerDeps: string[] | null = null;

  /**
   * Creates a Node.js Lambda function with project-standard configuration.
   *
   * Features:
   * - ARM64 Architecture (~34% cheaper than x86)
   * - Automatic log retention based on environment
   * - Conditional tracing/insights (disabled in dev for cost)
   * - Dynamic layer dependency exclusion
   */
  public static createNodejsFunction(
    scope: Construct,
    id: string,
    options: LambdaOptions,
    projectEnv?: string,
  ): lambda_nodejs.NodejsFunction {
    const config = getConfig(scope);
    const isDev = projectEnv === 'dev';

    // 1. Log Retention: Strict defaults to avoid storage costs
    const retention = options.logRetention ?? this.getLogRetention(projectEnv);
    const logGroup = new logs.LogGroup(scope, `${id}LogGroup`, { retention });

    // 2. Bundling & Layers: Dynamic dependency exclusion
    const externalModules = ['@aws-sdk/*'];
    if (options.layers && options.layers.length > 0) {
      externalModules.push(...this.getLayerDependencies());
    }

    // 3. Performance & Cost Optimization
    // ARM_64 is the project standard for cost-efficiency.
    const architecture = lambda.Architecture.ARM_64;
    const ephemeralStorageSize = options.ephemeralStorageSize ?? 512;
    const ephemeralStorage = cdk.Size.mebibytes(ephemeralStorageSize);

    // 4. Observability Guardrails
    // Active tracing and Insights have separate costs. Disabled in dev for free-tier safety.
    const tracing = isDev ? lambda.Tracing.DISABLED : lambda.Tracing.ACTIVE;
    const insights =
      options.enableInsights && !isDev ? lambda.LambdaInsightsVersion.VERSION_1_0_229_0 : undefined;

    const fn = new lambda_nodejs.NodejsFunction(scope, id, {
      entry: options.entry,
      handler: options.handler ?? 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture,
      memorySize: options.memorySize ?? 256,
      timeout: options.timeout ?? config.lambdaTimeout,
      tracing,
      insightsVersion: insights,
      recursiveLoop: options.enableRecursiveLoopDetection
        ? lambda.RecursiveLoop.TERMINATE
        : undefined,
      logGroup,
      environment: options.environment,
      deadLetterQueue: options.deadLetterQueue,
      retryAttempts: options.retryAttempts,
      reservedConcurrentExecutions: options.reservedConcurrentExecutions,
      layers: options.layers,
      ephemeralStorageSize: ephemeralStorage,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules,
        metafile: true,
        banner: '/* Awdah Lambda Bundle */',
      },
    });

    if (options.context) {
      cdk.Tags.of(fn).add('context', options.context);
    }

    if (options.createAlias) {
      const aliasName = options.aliasName ?? 'live';
      new lambda.Alias(scope, `${id}Alias`, {
        aliasName,
        version: fn.currentVersion,
        description: `${aliasName} alias for ${id}`,
      });
      cdk.Tags.of(fn).add('alias', aliasName);
    }

    return fn;
  }

  // --- Storage Creation ---

  /**
   * Creates an S3 Bucket with zero-cost standard encryption (SSE-S3).
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
      autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,
      versioned: true,
      // SSE-S3: managed by S3 at zero cost. KMS would add $0.03 per 10k requests.
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: blockPublicAccess ? s3.BlockPublicAccess.BLOCK_ALL : undefined,
      enforceSSL: true,
    });
  }

  /**
   * Creates a DynamoDB Table with Pay-Per-Request billing.
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
    const isDev = removalPolicy === cdk.RemovalPolicy.DESTROY;

    return new dynamodb.Table(scope, id, {
      tableName,
      partitionKey,
      sortKey,
      // PAY_PER_REQUEST: Zero cost when idle.
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // PITR: cost is $0.20 per GB/month. Disabled in dev by default to stay free.
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: options.pointInTimeRecoveryEnabled ?? !isDev,
      },
      removalPolicy,
      stream: options.stream,
      timeToLiveAttribute: options.timeToLiveAttribute,
    });
  }

  // --- Internal Helpers ---

  private static getLogRetention(projectEnv?: string): logs.RetentionDays {
    switch (projectEnv) {
      case 'dev':
        return logs.RetentionDays.ONE_DAY;
      case 'staging':
        return logs.RetentionDays.ONE_WEEK;
      case 'prod':
        return logs.RetentionDays.ONE_MONTH;
      default:
        return logs.RetentionDays.ONE_MONTH;
    }
  }

  private static getLayerDependencies(): string[] {
    if (this.cachedLayerDeps) return this.cachedLayerDeps;

    const pkgPath = path.join(__dirname, '../../../apps/backend/layer/nodejs/package.json');
    try {
      if (!fs.existsSync(pkgPath)) return [];
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = Object.keys(pkg.dependencies || {});
      this.cachedLayerDeps = deps;
      return deps;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[ProjectResourceFactory] Warning: Failed to read layer dependencies: ${e}`);
      return [];
    }
  }
}
