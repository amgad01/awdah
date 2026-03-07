import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DataStack } from './data-stack';

interface BackupStackProps extends cdk.StackProps {
    environment: string;
    dataStack: DataStack;
}

export class BackupStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: BackupStackProps) {
        super(scope, id, props);

        this.addDependency(props.dataStack);
    }
}
