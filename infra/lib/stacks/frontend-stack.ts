import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { BaseStack, type BaseStackProps } from '../shared/base-stack';

export interface FrontendStackProps extends BaseStackProps {
  domainName?: string;
  hostedZoneId?: string;
  hostedZoneName?: string;
  certificateArn?: string;
}

export class FrontendStack extends BaseStack {
  public readonly siteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    this.addContextTag('frontend');

    const hasPartialCustomDomainConfig = [
      props.domainName,
      props.hostedZoneId,
      props.hostedZoneName,
      props.certificateArn,
    ].some(Boolean);
    const hasFullCustomDomainConfig = Boolean(
      props.domainName && props.hostedZoneId && props.hostedZoneName && props.certificateArn,
    );

    if (hasPartialCustomDomainConfig && !hasFullCustomDomainConfig) {
      throw new Error(
        'Custom frontend domain requires domainName, hostedZoneId, hostedZoneName, and certificateArn.',
      );
    }

    const siteDistPath = path.join(__dirname, '../../../apps/frontend/dist');
    if (!fs.existsSync(siteDistPath)) {
      throw new Error(
        `Frontend build output not found at ${siteDistPath}. Run "npm run build --workspace=apps/frontend" before deploying the frontend stack.`,
      );
    }

    this.siteBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${this.resourcePrefix}awdah-frontend-${this.projectEnv}-${this.account}`,
      removalPolicy: this.removalPolicy,
      autoDeleteObjects: this.removalPolicy === cdk.RemovalPolicy.DESTROY,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    // Fetch API endpoint from SSM instead of direct reference to break CFN Export/Import link
    const certificate = props.certificateArn
      ? acm.Certificate.fromCertificateArn(this, 'FrontendCertificate', props.certificateArn)
      : undefined;

    this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultRootObject: 'index.html',
      domainNames: props.domainName ? [props.domainName] : undefined,
      certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    if (
      hasFullCustomDomainConfig &&
      props.domainName &&
      props.hostedZoneId &&
      props.hostedZoneName
    ) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'FrontendHostedZone', {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.hostedZoneName,
      });

      new route53.ARecord(this, 'FrontendAliasRecord', {
        zone: hostedZone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(this.distribution),
        ),
      });

      new route53.AaaaRecord(this, 'FrontendAliasRecordIpv6', {
        zone: hostedZone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(this.distribution),
        ),
      });
    }

    new s3deploy.BucketDeployment(this, 'DeployFrontendAssets', {
      sources: [s3deploy.Source.asset(siteDistPath)],
      destinationBucket: this.siteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      prune: true,
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: props.domainName
        ? `https://${props.domainName}`
        : `https://${this.distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.siteBucket.bucketName,
    });
    if (props.domainName) {
      new cdk.CfnOutput(this, 'FrontendCustomDomain', {
        value: props.domainName,
      });
    }

    // Export Frontend URL to SSM for CORS sealing/decoupling
    new ssm.StringParameter(this, 'FrontendUrlParameter', {
      parameterName: `/awdah/${this.projectEnv}/frontend/url`,
      stringValue: props.domainName
        ? `https://${props.domainName}`
        : `https://${this.distribution.distributionDomainName}`,
      description: `Awdah Frontend URL (${this.projectEnv})`,
    });
  }
}
