/**
 * Checks if a log entry with the same type and optional extra criteria already exists.
 * Used to ensure idempotency across use cases.
 */
export function isDuplicateLog(
  existing: readonly unknown[],
  type: string,
  extra?: { key: string; value: string },
): boolean {
  return existing.some((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const log = item as any;
    const logTypeVO = log.type as { getValue: () => string } | undefined;
    const logType = logTypeVO?.getValue() ?? log.type;
    const typeMatch = String(logType).toLowerCase() === type.toLowerCase();

    if (!extra) return typeMatch;

    const logExtraVO = log[extra.key] as { getValue: () => string } | undefined;
    const logExtraValue = logExtraVO?.getValue?.() ?? log[extra.key];
    return typeMatch && String(logExtraValue).toLowerCase() === extra.value.toLowerCase();
  });
}
