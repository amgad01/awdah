const TRANSLATABLE_KEY_PATTERN = /^[a-z]+\.[a-z0-9_.-]+$/;

// Known Cognito error messages (case-insensitive matching)
const KNOWN_AUTH_ERRORS: Array<{ pattern: RegExp; key: string }> = [
  {
    pattern: /incorrect\s+username(\s+or\s+password)?/i,
    key: 'auth.incorrect_username_or_password',
  },
  {
    pattern:
      /usernameexists|user\s+already\s+exists|account\s+with\s+the\s+given\s+email\s+already\s+exists/i,
    key: 'auth.account_exists_error',
  },
  { pattern: /user\s+not\s+found/i, key: 'auth.user_not_found' },
  { pattern: /password\s+attempts\s+exceeded/i, key: 'auth.attempts_exceeded' },
  {
    pattern: /network\s+error|failed\s+to\s+fetch|load\s+failed|dns\s+failure/i,
    key: 'auth.network_error',
  },
  { pattern: /timeout|timed\s+out/i, key: 'auth.connection_timeout' },
];

function extractAuthErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'string') {
    return error.trim();
  }

  if (error instanceof Error) {
    return error.message.trim();
  }

  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const structuredError = error as Record<string, unknown>;
  const candidate = [structuredError.message, structuredError.code, structuredError.name].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );

  return candidate?.trim();
}

export function getAuthErrorKey(error: unknown, fallbackKey: string): string {
  const message = extractAuthErrorMessage(error);

  if (message) {
    const normalizedMessage = message.trim();

    // Check known error patterns first
    for (const { pattern, key } of KNOWN_AUTH_ERRORS) {
      if (pattern.test(normalizedMessage)) {
        return key;
      }
    }

    if (TRANSLATABLE_KEY_PATTERN.test(normalizedMessage)) {
      return normalizedMessage;
    }
  }

  return fallbackKey;
}
