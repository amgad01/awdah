import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DataStack } from './data-stack';
import { AuthStack } from './auth-stack';

interface ApiStackProps extends cdk.StackProps {
    environment: string;
    dataStack: DataStack;
    authStack: AuthStack;
}

export class ApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        this.addDependency(props.dataStack);
        this.addDependency(props.authStack);
    }
}
