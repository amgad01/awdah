import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { DataStack } from './data-stack';

export interface BackupStackProps extends cdk.StackProps {
  environment: string;
  dataStack: DataStack;
  ticket?: string;
}

export class BackupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackupStackProps) {
    super(scope, id, props);

    const resourceSuffix = props.ticket ? `-${props.ticket}` : '';

    // Manual export bucket for DynamoDB JSON backups
    new s3.Bucket(this, 'BackupBucket', {
      bucketName: `awdah-backups-${props.environment}${resourceSuffix}-${this.account}`,
      removalPolicy:
        props.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== 'prod',
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Note: PITR is enabled on the tables in DataStack.
  }
}
