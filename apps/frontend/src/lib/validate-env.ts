/**
 * Validates required Vite environment variables at application startup.
 *
 * In auth mode 'local' (development), Cognito variables are not required — the local
 * simulation handles authentication directly. In any other mode the Cognito variables
 * must be present.
 *
 * `VITE_API_BASE_URL` is optional in all modes:
 * - empty => same-origin requests (for example CloudFront proxying `/v1/*` to the API)
 * - set   => explicit backend origin
 *
 * Throws loudly so startup fails visibly rather than silently defaulting to missing
 * Cognito values, which would produce cryptic runtime auth errors.
 */
export function validateEnv(): void {
  const authMode = import.meta.env.VITE_AUTH_MODE;

  // Cognito variables are only required when using real authentication
  if (authMode !== 'local') {
    const required: string[] = [
      'VITE_AWS_REGION',
      'VITE_COGNITO_USER_POOL_ID',
      'VITE_COGNITO_CLIENT_ID',
    ];
    const missing = required.filter((key) => !import.meta.env[key]);
    if (missing.length > 0) {
      throw new Error(`[env] Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}
