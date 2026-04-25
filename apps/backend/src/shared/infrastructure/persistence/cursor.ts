import { ValidationError, ERROR_CODES } from '@awdah/shared';

export function encodeCursor(key?: Record<string, unknown>): string | undefined {
  if (!key) {
    return undefined;
  }

  return Buffer.from(JSON.stringify(key), 'utf8').toString('base64url');
}

export function decodeCursor(cursor?: string): Record<string, unknown> | undefined {
  if (!cursor) {
    return undefined;
  }

  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Cursor payload must be an object');
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new ValidationError(ERROR_CODES.INVALID_PAGINATION_CURSOR);
  }
}
