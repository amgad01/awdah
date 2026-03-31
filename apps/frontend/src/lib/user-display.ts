function isCryptographicIdentifier(value?: string | null): boolean {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.includes('@')) return false;

  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ||
    /^[0-9a-f-]{24,}$/i.test(trimmed)
  );
}

export function getUserDisplayName(options: {
  profileUsername?: string | null;
  email?: string | null;
  sessionUsername?: string | null;
  fallback: string;
}): string {
  const preferred = options.profileUsername?.trim();
  if (preferred) return preferred;

  const email = options.email?.trim();
  if (email) return email;

  const sessionUsername = options.sessionUsername?.trim();
  if (sessionUsername && !isCryptographicIdentifier(sessionUsername)) {
    return sessionUsername;
  }

  return options.fallback;
}

export function getUserDisplayInitial(displayName?: string | null, fallback = 'U'): string {
  const firstCharacter = displayName?.trim().charAt(0);
  return firstCharacter ? firstCharacter.toUpperCase() : fallback;
}
