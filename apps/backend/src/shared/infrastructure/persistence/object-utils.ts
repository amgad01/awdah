/**
 * Strips `undefined` values from a plain object before it is handed to
 * DynamoDB.  DynamoDB rejects `undefined` attribute values, so this helper
 * keeps persistence mappers clean — they can spread optional domain fields
 * without guarding each one individually.
 */
export function omitUndefinedFields(item: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));
}
