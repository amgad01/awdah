import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { getFullResourceName, getResourcePrefix } from './naming';

export interface BaseStackProps extends cdk.StackProps {
  projectEnv: string;
}

/**
 * Base stack for all project stacks.
 * Handles standard tagging, resource naming prefixes, and environment state.
 */
export class BaseStack extends cdk.Stack {
  public readonly projectEnv: string;
  public readonly removalPolicy: cdk.RemovalPolicy;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    const { projectEnv, ...stackProps } = props;
    super(scope, id, stackProps);

    this.projectEnv = projectEnv;
    this.removalPolicy =
      this.projectEnv === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
  }

  /**
   * Generates a full resource name with prefix and environment.
   * Format: [prefix]Awdah-[name]-[env]
   */
  public fullResourceName(name: string): string {
    return getFullResourceName(this, name, this.projectEnv);
  }

  /**
   * Helper to get common ticket prefix from context.
   * Format: ticket- (or empty string)
   */
  public getTicketPrefix(): string {
    return getResourcePrefix(this);
  }

  /**
   * Applies a context tag to this stack and all its children.
   */
  protected addContextTag(context: string): void {
    cdk.Tags.of(this).add('context', context);
  }
}
