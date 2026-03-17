import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { BaseStack, BaseStackProps } from '../shared/base-stack';

export type AuthStackProps = BaseStackProps;

/**
 * AuthStack — Cognito User Pool and Client for Awdah.
 *
 * Authentication uses email + password via the Cognito SRP (Secure Remote Password) protocol.
 * Passwords are never transmitted — SRP proves knowledge of the password through a
 * mathematical challenge-response exchange, giving MitM resistance with no extra cost or
 * Lambda triggers.
 */
export class AuthStack extends BaseStack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    this.addContextTag('user');

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: this.fullResourceName('UserPool'),

      // Sign-up
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      signInCaseSensitive: false,

      // Verification
      autoVerify: { email: true },
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },

      // Password policy — explicit rather than relying on Cognito defaults
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7),
      },

      // Recovery — email only; no SMS to keep costs at zero and attack surface small
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // Standard attributes
      standardAttributes: {
        email: { required: true, mutable: false },
      },

      removalPolicy: this.removalPolicy,
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: this.fullResourceName('WebClient'),

      // SRP only — no USER_PASSWORD_AUTH (plain-text password over the wire) or ADMIN auth
      authFlows: {
        userSrp: true,
      },

      // Token validity — matches the session timeout spec in the architecture docs
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),

      // Allow tokens to be revoked on sign-out, giving users a real logout guarantee
      enableTokenRevocation: true,

      // Prevent user enumeration: auth errors never reveal whether the account exists
      preventUserExistenceErrors: true,

      // No client secret — this is a public SPA client (browser-side)
      generateSecret: false,
    });

    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
  }
}
