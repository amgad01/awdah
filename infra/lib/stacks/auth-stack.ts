import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface AuthStackProps extends cdk.StackProps {
    environment: string;
}

export class AuthStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AuthStackProps) {
        super(scope, id, props);
    }
}
