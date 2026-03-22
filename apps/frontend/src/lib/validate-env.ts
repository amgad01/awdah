/**
 * Validates required Vite environment variables at application startup.
 *
 * In auth mode 'local' (development), Cognito variables are not required — the local
 * simulation handles authentication directly. In any other mode they must be present.
 *
 * Throws loudly so the build breaks visibly rather than silently defaulting to empty strings,
 * which would produce cryptic Cognito errors at runtime.
 */
export function validateEnv(): void {
  const authMode = import.meta.env.VITE_AUTH_MODE;

  // API base URL is always required
  if (!import.meta.env.VITE_API_URL) {
    throw new Error('[env] VITE_API_URL is required');
  }

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
