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
  /** Ephemeral storage size in MB (default: 512, min: 512, max: 10240) */
  ephemeralStorageSize?: number;
  /** Create a live alias for this function (enables weighted deployments) */
  createAlias?: boolean;
  /** Alias name when createAlias is true (default: 'live') */
  aliasName?: string;
  /** Enable Lambda Insights for enhanced monitoring (CPU, memory, cold starts) */
  enableInsights?: boolean;
  /** Enable recursive loop detection (prevents runaway invocations) */
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
  private static cachedLayerDeps: string[] | null = null;

  /**
   * Reads shared dependencies from the Lambda layer's package.json.
   * These should be excluded from individual Lambda bundles.
   */
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

  /**
   * Get default log retention based on environment.
   * dev: 1 day (active debugging)
   * staging: 7 days (moderate retention for testing)
   * prod: 30 days (standard production retention)
   */
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
    const hasSharedLayer = options.layers && options.layers.length > 0;

    if (hasSharedLayer) {
      // Exclude shared dependencies - they're in the layer
      externalModules.push(...this.getLayerDependencies());
    }

    // Ephemeral storage: AWS requires minimum 512MB, default to 512MB
    // Can tune to 10240MB max for heavy file operations (exports, processing)
    const ephemeralStorageSize = options.ephemeralStorageSize ?? 512;
    const ephemeralStorage = cdk.Size.mebibytes(ephemeralStorageSize);

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
      // Lambda Insights: enhanced monitoring (CPU, memory, cold start analysis)
      // Note: Adds ~$0.60 per million invocations
      insightsVersion: options.enableInsights
        ? lambda.LambdaInsightsVersion.VERSION_1_0_229_0
        : undefined,
      // Recursive loop detection: prevents runaway invocations
      // Automatically stops functions that appear to be in a recursive loop
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
        // Exclude the AWS SDK v3 — Lambda runtime already includes it.
        // This shrinks bundles and avoids mismatched SDK versions.
        externalModules,
        // Generate metafile for bundle analysis
        metafile: true,
        // Output metafile to analyze bundle composition
        banner: '/* Awdah Lambda Bundle */',
      },
    });

    if (options.context) {
      cdk.Tags.of(fn).add('context', options.context);
    }

    // Create alias if requested (enables weighted deployments and easier rollbacks)
    if (options.createAlias) {
      const aliasName = options.aliasName ?? 'live';
      new lambda.Alias(scope, `${id}Alias`, {
        aliasName,
        version: fn.currentVersion,
        description: `${aliasName} alias for ${id}`,
      });

      // Tag the function to indicate it has an alias
      cdk.Tags.of(fn).add('alias', aliasName);
    }

    return fn;
  }

  /**
   * Analyzes the bundle metafile for a Lambda function.
   * Call this after synthesis to see what's being bundled.
   */
  public static analyzeBundle(fn: lambda_nodejs.NodejsFunction): void {
    // Access the metafile through the function's bundling configuration
    // This is logged during build but can be analyzed programmatically if needed
    const buildOptions = (fn as unknown as { _bundling?: { options?: { metafile?: boolean } } })
      ._bundling?.options;
    if (buildOptions?.metafile) {
      // eslint-disable-next-line no-console -- Build-time logging for bundle analysis
      console.log(`[Bundle Analysis] ${fn.node.id}: metafile enabled`);
    }
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
