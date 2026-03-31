import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';
import {
  CognitoIdentityProviderClient,
  GlobalSignOutCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { jwtDecode } from 'jwt-decode';
import type { AuthService, UserSession } from './auth-service';
import {
  TOKEN_KEY,
  clearPersistedSession,
  persistSession,
  readPersistedSession,
} from './auth-service';

// VITE_COGNITO_USER_POOL_ID is required for SRP — the UserPool ID encodes the region too
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';

const userPool = new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId });
const sdkClient = new CognitoIdentityProviderClient({ region });

interface CognitoJwtPayload {
  sub: string;
  email?: string;
  'cognito:username'?: string;
  exp?: number;
}

/** Extract a UserSession from a completed Cognito authentication session. */
function buildSession(cognitoSession: CognitoUserSession): UserSession {
  // Access token is sent to the API and used for GlobalSignOut.
  // ID token is decoded once here purely to read display attributes (email, username).
  const accessToken = cognitoSession.getAccessToken().getJwtToken();
  const idToken = cognitoSession.getIdToken().getJwtToken();
  const accessTokenPayload = jwtDecode<CognitoJwtPayload>(accessToken);
  const decoded = jwtDecode<CognitoJwtPayload>(idToken);

  return {
    userId: decoded.sub,
    username: decoded.email || decoded['cognito:username'] || decoded.sub,
    email: decoded.email,
    token: accessToken,
    expiresAt: accessTokenPayload.exp ? accessTokenPayload.exp * 1000 : Date.now() + 55 * 60_000,
  };
}

export const cognitoAuthService: AuthService = {
  async signIn(email: string, password: string): Promise<UserSession> {
    // USER_SRP_AUTH: the SRP challenge-response exchange proves knowledge of the
    // password without transmitting it. Matches authFlows.userSrp = true in CDK.
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (cognitoSession: CognitoUserSession) => {
          const session = buildSession(cognitoSession);
          persistSession(session);
          resolve(session);
        },
        onFailure: (err: Error) => reject(err),
        // newPasswordRequired is not expected in normal sign-in but must be declared
        newPasswordRequired: () => reject(new Error('Password reset required')),
      });
    });
  },

  async signUp(email: string, password: string): Promise<{ needsVerification: boolean }> {
    const result = await sdkClient.send(
      new SignUpCommand({
        ClientId: clientId,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: 'email', Value: email }],
      }),
    );
    return { needsVerification: !result.UserConfirmed };
  },

  async confirmSignUp(email: string, code: string): Promise<void> {
    await sdkClient.send(
      new ConfirmSignUpCommand({
        ClientId: clientId,
        Username: email,
        ConfirmationCode: code,
      }),
    );
  },

  async forgotPassword(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.forgotPassword({
        onSuccess: () => resolve(),
        onFailure: (err: Error) => reject(err),
        inputVerificationCode: () => {
          // Cognito has sent a verification code to the user email.
          resolve();
        },
      });
    });
  },

  async confirmPassword(email: string, code: string, newPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => resolve(),
        onFailure: (err: Error) => reject(err),
      });
    });
  },

  async signOut(): Promise<void> {
    const token = typeof window === 'undefined' ? null : window.sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        // GlobalSignOut invalidates all sessions server-side — requires the access token
        await sdkClient.send(new GlobalSignOutCommand({ AccessToken: token }));
      } catch {
        // Proceeds with local cleanup even if the server-side revocation fails
        // (token may already be expired or the account may have been deleted)
      }
    }
    clearPersistedSession();
  },

  getCurrentUser(): UserSession | null {
    return readPersistedSession();
  },

  getToken(): string | null {
    return readPersistedSession()?.token ?? null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
