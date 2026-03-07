import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BackupStack } from './backup-stack';

interface AlarmStackProps extends cdk.StackProps {
    environment: string;
    backupStack: BackupStack;
}

export class AlarmStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AlarmStackProps) {
        super(scope, id, props);

        this.addDependency(props.backupStack);
    }
}
